import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const VERSION: string = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

export const LOGIN_HINT = "Run `npx openprofit login` first.";

// ---- Config: one entry per server URL, so hosted and self-hosted coexist.

type Workspace = { name: string; slug: string };
type Entry = { url: string; token: string; workspace: Workspace };
type Config = { current?: string; servers: Record<string, Entry> };

export type Server = { url: string; token?: string; workspace?: Workspace };

const CONFIG_PATH = join(
	process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
	"openprofit",
	"config.json",
);

function readConfig(): Config {
	try {
		return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
	} catch {
		return { servers: {} };
	}
}

function writeConfig(config: Config) {
	mkdirSync(dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
	writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, {
		mode: 0o600,
	});
	// `mode` only applies when the file is created.
	chmodSync(CONFIG_PATH, 0o600);
}

// --url, then OPENPROFIT_URL, then the last login, then the hosted app.
export function resolveServer(flagUrl?: string): Server {
	const config = readConfig();
	const url = (
		flagUrl ||
		process.env.OPENPROFIT_URL ||
		config.current ||
		"https://openprofit.dev"
	).replace(/\/+$/, "");
	const entry = config.servers[url];
	return {
		url,
		token: process.env.OPENPROFIT_TOKEN || entry?.token,
		workspace: entry?.workspace,
	};
}

export function saveLogin(url: string, token: string, workspace: Workspace) {
	const config = readConfig();
	config.servers[url] = { url, token, workspace };
	config.current = url;
	writeConfig(config);
}

export function removeLogin(url: string): boolean {
	const config = readConfig();
	if (!config.servers[url]) return false;
	delete config.servers[url];
	if (config.current === url) delete config.current;
	writeConfig(config);
	return true;
}

// ---- HTTP

export async function request<T = Record<string, unknown>>(
	server: Server,
	method: "GET" | "POST",
	path: string,
	body?: unknown,
): Promise<{ status: number; data: T }> {
	const res = await fetch(server.url + path, {
		method,
		headers: {
			"content-type": "application/json",
			...(server.token && { authorization: `Bearer ${server.token}` }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	}).catch(() => {
		throw new Error(`Can't reach ${server.url}.`);
	});
	if (res.status === 401) {
		throw new Error(`${server.url} rejected the token. ${LOGIN_HINT}`);
	}
	const data = (await res.json().catch(() => ({}))) as T;
	return { status: res.status, data };
}

// ---- Env files

// Parses dotenv syntax: `export` prefix, comments, single, double and
// backtick quotes (quoted values may span lines; double quotes expand \n,
// \r, \t, \" and \\). An unquoted value ends at a ` #` comment.
export function parseEnv(src: string): Record<string, string> {
	const out: Record<string, string> = {};
	const line =
		/^[ \t]*(?:export[ \t]+)?([A-Za-z_][\w.-]*)[ \t]*=[ \t]*("(?:\\[\s\S]|[^"\\])*"|'[^']*'|`[^`]*`|[^\r\n]*)/gm;
	const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t" };
	for (const [, key, raw] of src.matchAll(line)) {
		const quote = raw[0];
		if (quote === '"') {
			out[key] = raw
				.slice(1, -1)
				.replace(/\\(.)/g, (_, c: string) => escapes[c] ?? c);
		} else if (quote === "'" || quote === "`") {
			out[key] = raw.slice(1, -1);
		} else {
			out[key] = raw.replace(/(^|[ \t]+)#.*$/, "").trim();
		}
	}
	return out;
}

// Variables from the files (later files win) over the process environment.
// `optional` skips files that don't exist.
export function loadEnv(files: string[], optional = false) {
	const env: Record<string, string | undefined> = { ...process.env };
	for (const file of files) {
		try {
			Object.assign(env, parseEnv(readFileSync(file, "utf8")));
		} catch (e) {
			if (!(optional && (e as NodeJS.ErrnoException).code === "ENOENT")) {
				throw new Error(`Can't read ${file}`);
			}
		}
	}
	return env;
}

// Env var names that usually hold each provider's secret key.
export const KNOWN_ENV: Record<string, string[]> = {
	stripe: ["STRIPE_RESTRICTED_KEY", "STRIPE_SECRET_KEY", "STRIPE_API_KEY"],
	polar: ["POLAR_ACCESS_TOKEN"],
	openai: ["OPENAI_ADMIN_KEY", "OPENAI_API_KEY"],
	anthropic: ["ANTHROPIC_ADMIN_KEY"],
	vercel: ["VERCEL_TOKEN"],
	cloudflare: ["CLOUDFLARE_API_TOKEN"],
	railway: ["RAILWAY_TOKEN", "RAILWAY_API_TOKEN"],
};

// ---- Providers and connections

type Field = {
	name: string;
	label: string;
	secret?: boolean;
	optional?: boolean;
};
export type Provider = {
	id: string;
	name: string;
	kind: string;
	fields: Field[];
};

export async function getProvider(server: Server, id: string) {
	const { status, data } = await request<Provider[]>(
		server,
		"GET",
		"/api/providers",
	);
	if (status !== 200 || !Array.isArray(data)) {
		throw new Error(`Couldn't list providers (HTTP ${status}).`);
	}
	const provider = data.find((p) => p.id === id.toLowerCase());
	if (!provider) {
		const ids = data.map((p) => p.id).join(", ");
		throw new Error(`Unknown provider "${id}". Available: ${ids}.`);
	}
	return provider;
}

export function describeFields(provider: Provider) {
	return provider.fields
		.map(
			(f) =>
				`${f.name}${f.secret ? " (secret)" : ""}${f.optional ? " (optional)" : ""}`,
		)
		.join(", ");
}

type ConnectInput = {
	provider: string;
	env: Record<string, string | undefined>;
	envLabel: string;
	// Env var holding the provider's only secret field.
	key?: string;
	// Field name to env var name.
	fields: Record<string, string>;
	// Field name to literal value, for non-secret fields only.
	values: Record<string, string>;
	productId?: string;
};

// Builds the credentials from env vars and POSTs them. Error messages name
// fields and env vars but never include a value.
export async function connect(server: Server, input: ConnectInput) {
	const provider = await getProvider(server, input.provider);
	const field = (name: string) => {
		const f = provider.fields.find((f) => f.name === name);
		if (!f) {
			throw new Error(
				`${provider.name} has no field "${name}". Fields: ${describeFields(provider)}.`,
			);
		}
		return f;
	};

	const fields = { ...input.fields };
	if (input.key) {
		const secret = provider.fields.filter((f) => f.secret);
		if (secret.length !== 1) {
			throw new Error(
				`${provider.name} has ${secret.length} secret fields, so --key is ambiguous. Map each one with --field. Fields: ${describeFields(provider)}.`,
			);
		}
		fields[secret[0].name] ??= input.key;
	}

	const credentials: Record<string, string> = {};
	for (const [name, envName] of Object.entries(fields)) {
		field(name);
		const value = input.env[envName];
		if (!value) throw new Error(`${envName} is not set in ${input.envLabel}.`);
		credentials[name] = value;
	}
	for (const [name, value] of Object.entries(input.values)) {
		if (field(name).secret) {
			throw new Error(
				`${name} is a secret field. Pass the name of an env var that holds it instead of the value.`,
			);
		}
		credentials[name] = value;
	}
	const missing = provider.fields.filter(
		(f) => !f.optional && !credentials[f.name],
	);
	if (missing.length) {
		throw new Error(
			`Missing ${missing.map((f) => f.name).join(", ")}. ${provider.name} fields: ${describeFields(provider)}.`,
		);
	}

	const { status, data } = await request<{
		connection?: { label: string };
		error?: string;
	}>(server, "POST", "/api/connections", {
		provider: provider.id,
		credentials,
		...(input.productId && { product_id: input.productId }),
	});
	if (status !== 201 || !data.connection) {
		const secrets = provider.fields
			.filter((f) => f.secret && credentials[f.name])
			.map((f) => credentials[f.name]);
		throw new Error(
			scrub(data.error ?? `Connecting failed (HTTP ${status}).`, secrets),
		);
	}
	return `Connected ${provider.name} (${data.connection.label}), first sync started`;
}

// Drops a server message that quotes 8 or more characters of a secret.
function scrub(message: string, secrets: string[]) {
	const leaks = secrets.some((s) => {
		for (let i = 0; i + 8 <= s.length; i++) {
			if (message.includes(s.slice(i, i + 8))) return true;
		}
		return message.includes(s);
	});
	return leaks ? "OpenProfit rejected the credentials." : message;
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import {
	connect,
	LOGIN_HINT,
	loadEnv,
	removeLogin,
	request,
	resolveServer,
	saveLogin,
	VERSION,
} from "./lib.js";

const HELP: Record<string, string> = {
	main: `Usage: openprofit <command> [--url <url>]

Commands:
  login               Sign in through the browser and save a token
  logout              Delete the saved token for this server
  whoami              Show the workspace and server in use
  connect <provider>  Connect a provider with a key from an env file
  mcp                 Run the local MCP server over stdio

Options:
  --url <url>   Server to use. Default: OPENPROFIT_URL, then the last login,
                then https://openprofit.dev
  -h, --help    Show help for a command
  -v, --version Show the version

OPENPROFIT_TOKEN overrides the saved token.`,

	login: `Usage: openprofit login [--url <url>]

Opens the browser to approve a code, then saves a token in
~/.config/openprofit/config.json.`,

	logout: `Usage: openprofit logout [--url <url>]

Deletes the saved token for the server.`,

	whoami: `Usage: openprofit whoami [--url <url>]

Shows the workspace and server the token belongs to.`,

	connect: `Usage: openprofit connect <provider> [options]

Reads the provider's key from an env file or the environment and sends it to
OpenProfit. The CLI never prints the key.

Options:
  --env-file <path>     Read variables from this file. Default: the environment
  --key <NAME>          Env var that holds the provider's secret key
  --field <field=NAME>  Read a field from an env var (repeatable)
  --value <field=text>  Set a non-secret field, such as a team id (repeatable)
  --product <id>        Assign the connection to a product

Example:
  openprofit connect stripe --env-file .env --key STRIPE_RESTRICTED_KEY`,

	mcp: `Usage: openprofit mcp [--url <url>]

Runs an MCP server over stdio. It forwards OpenProfit's tools and replaces
connect_provider with a version that reads keys from local env files.

Claude Code:
  claude mcp add openprofit -- npx -y openprofit mcp`,
};

function pairs(list: string[] | undefined, flag: string) {
	const out: Record<string, string> = {};
	for (const item of list ?? []) {
		const i = item.indexOf("=");
		if (i < 1) throw new Error(`${flag} takes name=value, got "${item}".`);
		out[item.slice(0, i)] = item.slice(i + 1);
	}
	return out;
}

function openBrowser(url: string) {
	const cmd =
		process.platform === "darwin"
			? "open"
			: process.platform === "win32"
				? "explorer"
				: "xdg-open";
	spawn(cmd, [url], { stdio: "ignore", detached: true })
		.on("error", () => {})
		.unref();
}

async function login(url?: string) {
	const server = { ...resolveServer(url), token: undefined };
	const start = await request<{
		device_code: string;
		user_code: string;
		verification_url: string;
		expires_in: number;
		interval: number;
	}>(server, "POST", "/api/cli/login");
	if (start.status !== 200 || !start.data.device_code) {
		throw new Error(
			`${server.url} didn't start a login (HTTP ${start.status}).`,
		);
	}
	const { device_code, user_code, verification_url } = start.data;
	if (!/^https?:\/\//.test(verification_url)) {
		throw new Error(`${server.url} sent an invalid verification URL.`);
	}
	console.log(`Code: ${user_code}`);
	console.log(`Confirm it at ${verification_url}`);
	if (process.stdout.isTTY) openBrowser(verification_url);

	const deadline = Date.now() + (start.data.expires_in ?? 600) * 1000;
	while (Date.now() < deadline) {
		await sleep((start.data.interval ?? 5) * 1000);
		const poll = await request<{
			token?: string;
			workspace?: { name: string; slug: string };
		}>(server, "POST", "/api/cli/login/poll", { device_code });
		if (poll.status === 202) continue;
		if (poll.status === 410) break;
		if (poll.status !== 200 || !poll.data.token || !poll.data.workspace) {
			throw new Error(`Login failed (HTTP ${poll.status}).`);
		}
		saveLogin(server.url, poll.data.token, poll.data.workspace);
		console.log(
			`Logged in to ${poll.data.workspace.name} (${poll.data.workspace.slug}) on ${server.url}`,
		);
		return;
	}
	throw new Error("The code expired. Run `openprofit login` again.");
}

async function whoami(url?: string) {
	const server = resolveServer(url);
	if (!server.token)
		throw new Error(`Not logged in to ${server.url}. ${LOGIN_HINT}`);
	// Any authenticated call works; this one fails fast on a revoked token.
	await request(server, "GET", "/api/providers");
	const who = server.workspace
		? `${server.workspace.name} (${server.workspace.slug})`
		: "OPENPROFIT_TOKEN";
	console.log(`${who} on ${server.url}`);
}

async function main() {
	const { values: flags, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			url: { type: "string" },
			help: { type: "boolean", short: "h" },
			version: { type: "boolean", short: "v" },
			"env-file": { type: "string" },
			key: { type: "string" },
			field: { type: "string", multiple: true },
			value: { type: "string", multiple: true },
			product: { type: "string" },
		},
	});
	const [command, ...args] = positionals;

	if (flags.version) return console.log(VERSION);
	if (!command || flags.help) {
		return console.log(HELP[command ?? "main"] ?? HELP.main);
	}

	switch (command) {
		case "login":
			return login(flags.url);
		case "logout": {
			const { url } = resolveServer(flags.url);
			return console.log(
				removeLogin(url) ? `Logged out of ${url}` : `Not logged in to ${url}`,
			);
		}
		case "whoami":
			return whoami(flags.url);
		case "connect": {
			if (!args[0]) return console.log(HELP.connect);
			const server = resolveServer(flags.url);
			if (!server.token) throw new Error(LOGIN_HINT);
			const file = flags["env-file"];
			const message = await connect(server, {
				provider: args[0],
				env: loadEnv(file ? [file] : []),
				envLabel: file ? `${file} or the environment` : "the environment",
				key: flags.key,
				fields: pairs(flags.field, "--field"),
				values: pairs(flags.value, "--value"),
				productId: flags.product,
			});
			return console.log(message);
		}
		case "mcp": {
			const { serveMcp } = await import("./mcp.js");
			return serveMcp(resolveServer(flags.url));
		}
		default:
			throw new Error(
				`Unknown command "${command}". Run \`openprofit --help\`.`,
			);
	}
}

main().catch((e: Error) => {
	console.error(`openprofit: ${e.message}`);
	process.exit(1);
});

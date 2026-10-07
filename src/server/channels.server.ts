import { createHmac, randomBytes } from "node:crypto";
import dns from "node:dns";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIPv6, type LookupFunction } from "node:net";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import { SMS_CAP } from "#/lib/alerts";
import { APP_NAME } from "#/lib/app";
import { decrypt } from "#/lib/crypto";
import { isCloud } from "./billing.server";
import type { Workspace } from "./workspace.server";

// Slack, a signed webhook and SMS: every alert that opens goes to each one
// the workspace set up, next to the email.

export type Channels = typeof schema.alertChannels.$inferSelect;

export type OpenedAlert = {
	id: string;
	kind: string;
	title: string;
	detail: string | null;
	openedAt: number;
};

const link = () => `${process.env.APP_URL ?? ""}/app/alerts`;
const timeout = () => AbortSignal.timeout(15_000);
const month = () => new Date().toISOString().slice(0, 7);

export const loadChannels = (workspaceId: string) =>
	db.query.alertChannels.findFirst({
		where: eq(schema.alertChannels.workspaceId, workspaceId),
	});

// Upsert: one row per workspace.
export async function saveChannels(
	workspaceId: string,
	set: Partial<Omit<Channels, "workspaceId">>,
) {
	await db
		.insert(schema.alertChannels)
		.values({ workspaceId, ...set })
		.onConflictDoUpdate({ target: schema.alertChannels.workspaceId, set });
}

// Slack incoming webhooks:
// https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
export const isSlackWebhook = (raw: string) => {
	try {
		const u = new URL(raw);
		return (
			u.protocol === "https:" &&
			u.hostname === "hooks.slack.com" &&
			u.pathname.startsWith("/services/")
		);
	} catch {
		return false;
	}
};

// Slack treats &, < and > as control characters in text.
const slackEscape = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function postSlack(url: string, ws: Workspace, a: OpenedAlert) {
	const text = [
		`*${slackEscape(ws.name)}*: ${slackEscape(a.title)}`,
		a.detail && slackEscape(a.detail),
		`<${link()}|See it in ${APP_NAME}>`,
	]
		.filter(Boolean)
		.join("\n");
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ text }),
		signal: timeout(),
	});
	if (!res.ok)
		throw new Error(`Slack answered ${res.status}: ${await res.text()}`);
}

// Hosted: an endpoint must be public https, so a workspace can't make the
// server call addresses on its own network. Self-host allows anything.
// IPv4 rules also match IPv4-mapped IPv6 (::ffff:127.0.0.1).
const PRIVATE = new BlockList();
for (const [net, bits] of [
	["0.0.0.0", 8], // "this network"; 0.0.0.0 reaches localhost
	["10.0.0.0", 8],
	["100.64.0.0", 10], // CGNAT
	["127.0.0.0", 8],
	["169.254.0.0", 16], // link-local, cloud metadata
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["224.0.0.0", 4], // multicast
	["240.0.0.0", 4], // reserved, broadcast
] as const)
	PRIVATE.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
	["::", 96], // unspecified, loopback, IPv4-compatible
	["64:ff9b::", 96], // NAT64 to IPv4
	["64:ff9b:1::", 48],
	["fc00::", 7], // unique local
	["fe80::", 10], // link-local
	["fec0::", 10], // site-local
	["ff00::", 8], // multicast
] as const)
	PRIVATE.addSubnet(net, bits, "ipv6");
const isPrivate = (ip: string) =>
	PRIVATE.check(ip, isIPv6(ip) ? "ipv6" : "ipv4");
const PUBLIC_ONLY = "Use an address on the public internet";

// For the socket's `lookup`: resolves the name, fails if any address is
// private, and hands over only the addresses it checked, so the request
// connects to exactly those and a second DNS answer can't swap them.
// Sockets skip `lookup` for IP literals, which endpointProblem checks.
const publicLookup: LookupFunction = (hostname, options, callback) =>
	dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
		if (err) return callback(err, "");
		if (addrs.some((a) => isPrivate(a.address)))
			return callback(new Error(PUBLIC_ONLY), "");
		if (options.all) return callback(null, addrs);
		callback(null, addrs[0].address, addrs[0].family);
	});

export async function endpointProblem(raw: string): Promise<string | null> {
	let u: URL;
	try {
		u = new URL(raw);
	} catch {
		return "Enter a full URL, starting with https://";
	}
	if (!isCloud)
		return /^https?:$/.test(u.protocol)
			? null
			: "Enter a URL starting with https:// or http://";
	if (u.protocol !== "https:") return "Enter a URL starting with https://";
	const addrs = await lookup(u.hostname, { all: true }).catch(() => []);
	if (!addrs.length) return `${u.hostname} doesn't resolve`;
	if (addrs.some((a) => isPrivate(a.address))) return PUBLIC_ONLY;
	return null;
}

// Standard Webhooks secrets: "whsec_" plus base64 of 24 to 64 random bytes.
// https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
export const newWebhookSecret = () =>
	`whsec_${randomBytes(32).toString("base64")}`;

// Signature over `${id}.${timestamp}.${body}`, the scheme verifyWebhook in
// billing.server.ts checks for Polar.
export function signWebhook(secret: string, body: string, id: string) {
	const ts = String(Math.floor(Date.now() / 1000));
	const sig = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
		.update(`${id}.${ts}.${body}`)
		.digest("base64");
	return {
		"webhook-id": id,
		"webhook-timestamp": ts,
		"webhook-signature": `v1,${sig}`,
	};
}

export async function postWebhook(
	url: string,
	secret: string,
	ws: Workspace,
	a: OpenedAlert,
) {
	const problem = await endpointProblem(url);
	if (problem) throw new Error(problem);
	const body = JSON.stringify({
		type: a.kind === "test" ? "alert.test" : "alert.opened",
		id: a.id,
		workspace: { id: ws.id, name: ws.name },
		kind: a.kind,
		title: a.title,
		detail: a.detail,
		opened_at: new Date(a.openedAt).toISOString(),
		link: link(),
	});
	// node:http(s) rather than fetch, which has no `lookup`. It never follows
	// redirects. TLS still verifies the certificate against the hostname.
	const u = new URL(url);
	const status = await new Promise<number>((resolve, reject) => {
		const req = (u.protocol === "https:" ? httpsRequest : httpRequest)(
			u,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// The alert id, so a receiver can drop a duplicate.
					...signWebhook(secret, body, a.id),
				},
				lookup: isCloud ? publicLookup : undefined,
				// A pooled socket could have connected without that check.
				agent: false,
				signal: timeout(),
			},
			(res) => {
				res.resume();
				resolve(res.statusCode ?? 0);
			},
		);
		req.on("error", reject);
		req.end(body);
	});
	if (status < 200 || status > 299)
		throw new Error(`Your endpoint answered ${status}`);
}

// SMS through Twilio's Messages API:
// https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource
// TWILIO_FROM is a phone number or a Messaging Service SID (MG...).
// TWILIO_API_URL exists only to point tests at a local mock.
export const twilioReady = () =>
	!!(
		process.env.TWILIO_ACCOUNT_SID &&
		process.env.TWILIO_AUTH_TOKEN &&
		process.env.TWILIO_FROM
	);

// Hosted: Indie and Pro. Self-host: whenever Twilio is configured.
export const smsAllowed = (ws: Workspace) =>
	twilioReady() && (!isCloud || ws.plan !== "free");

async function twilio(to: string, body: string) {
	const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
	const from = process.env.TWILIO_FROM ?? "";
	const api = process.env.TWILIO_API_URL ?? "https://api.twilio.com";
	const res = await fetch(`${api}/2010-04-01/Accounts/${sid}/Messages.json`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${btoa(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`)}`,
		},
		body: new URLSearchParams({
			To: to,
			Body: body,
			...(from.startsWith("MG")
				? { MessagingServiceSid: from }
				: { From: from }),
		}),
		signal: timeout(),
	});
	if (!res.ok) {
		const err = (await res.json().catch(() => null)) as {
			message?: string;
		} | null;
		throw new Error(`Twilio answered ${res.status}: ${err?.message ?? ""}`);
	}
}

// Counts one SMS against the month. Hosted stops at SMS_CAP and returns
// null; the message that reaches the cap gets `last: true`. Verification
// codes and tests count too: they cost the same, and it caps resends.
async function takeSms(workspaceId: string) {
	const m = month();
	const t = schema.alertChannels;
	const [row] = await db
		.update(t)
		.set({
			smsMonth: m,
			smsCount: sql`case when ${t.smsMonth} = ${m} then ${t.smsCount} + 1 else 1 end`,
		})
		.where(
			and(
				eq(t.workspaceId, workspaceId),
				isCloud
					? or(
							sql`${t.smsMonth} is distinct from ${m}`,
							lt(t.smsCount, SMS_CAP),
						)
					: undefined,
			),
		)
		.returning({ count: t.smsCount });
	if (!row) return null;
	return { last: isCloud && row.count === SMS_CAP };
}

export async function sendSms(
	ws: Workspace,
	to: string,
	body: string,
): Promise<"sent" | "capped"> {
	const slot = await takeSms(ws.id);
	if (!slot) return "capped";
	await twilio(
		to,
		slot.last
			? `${body}\nThat was the last SMS this month. Alerts keep going to email and your other channels.`
			: body,
	);
	return "sent";
}

export const alertSms = (a: OpenedAlert) => `${APP_NAME}: ${a.title} ${link()}`;

// Verification codes: HMAC with SECRET_KEY, so the stored value is useless
// without the key. Stored as "<hash>:<wrong tries>".
export const codeHash = (workspaceId: string, phone: string, code: string) =>
	createHmac("sha256", process.env.SECRET_KEY ?? "")
		.update(`${workspaceId}:${phone}:${code}`)
		.digest("hex");

// Every configured channel gets every opened alert. One failing channel
// doesn't stop the others; failures go to the log.
export async function sendToChannels(ws: Workspace, opened: OpenedAlert[]) {
	const ch = await loadChannels(ws.id);
	if (!ch) return;
	const jobs: [string, (a: OpenedAlert) => Promise<unknown>][] = [];
	const { slackWebhook, webhookUrl, webhookSecret, smsPhone } = ch;
	if (slackWebhook)
		jobs.push([
			"slack",
			async (a) => postSlack(await decrypt<string>(slackWebhook), ws, a),
		]);
	if (webhookUrl && webhookSecret)
		jobs.push([
			"webhook",
			async (a) =>
				postWebhook(
					await decrypt<string>(webhookUrl),
					await decrypt<string>(webhookSecret),
					ws,
					a,
				),
		]);
	if (smsPhone && ch.smsVerifiedAt && smsAllowed(ws))
		jobs.push(["sms", (a) => sendSms(ws, smsPhone, alertSms(a))]);
	for (const a of opened) {
		const results = await Promise.allSettled(jobs.map(([, run]) => run(a)));
		results.forEach((r, i) => {
			if (r.status === "rejected")
				console.error(
					`[alerts] ${jobs[i][0]} for workspace ${ws.id} failed:`,
					r.reason,
				);
		});
	}
}

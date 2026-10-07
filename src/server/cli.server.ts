import { randomInt } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db, schema } from "#/db";
import { appUrl, issueToken, randomToken, sha256 } from "./api.server";

// `npx openprofit login`: a device-code flow. The CLI gets a device code
// (kept secret) and a user code (shown in the terminal and the browser),
// the user approves the user code at /cli, and the CLI polls until it
// receives a token.

const TTL = 10 * 60_000;
// No vowels, so codes never spell words; no 0/O or 1/I lookalikes.
const LETTERS = "BCDFGHJKLMNPQRSTVWXZ";
const userCode = () => {
	const c = Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]);
	return `${c.slice(0, 4).join("")}-${c.slice(4).join("")}`;
};

export async function startCliLogin(request: Request) {
	// Expired codes go first, which also frees them for reuse.
	await db
		.delete(schema.cliLogins)
		.where(lt(schema.cliLogins.expiresAt, Date.now()));
	const deviceCode = randomToken();
	for (let attempt = 0; ; attempt++) {
		const code = userCode();
		try {
			await db.insert(schema.cliLogins).values({
				deviceCodeHash: sha256(deviceCode),
				userCode: code,
				expiresAt: Date.now() + TTL,
			});
			return {
				device_code: deviceCode,
				user_code: code,
				verification_url: `${appUrl(request)}/cli?code=${code}`,
				expires_in: TTL / 1000,
				interval: 2,
			};
		} catch (err) {
			// A user code collision; 20^8 codes make a second one unlikely.
			if (attempt >= 2) throw err;
		}
	}
}

// 202 while waiting, 200 with the token once (approval issues a write
// token), 410 when the code expired, was cancelled or was already used.
export async function pollCliLogin(deviceCode: string) {
	const row = await db.query.cliLogins.findFirst({
		where: eq(schema.cliLogins.deviceCodeHash, sha256(deviceCode)),
	});
	const now = Date.now();
	if (!row || row.expiresAt <= now || row.apiTokenId)
		return { status: 410, body: { status: "expired" } };
	if (!row.approvedAt || !row.userId || !row.workspaceId)
		return { status: 202, body: { status: "pending" } };
	// Expiring the row claims it, so two polls never get two tokens.
	const [claimed] = await db
		.update(schema.cliLogins)
		.set({ expiresAt: now })
		.where(
			and(eq(schema.cliLogins.id, row.id), gt(schema.cliLogins.expiresAt, now)),
		)
		.returning({ id: schema.cliLogins.id });
	if (!claimed) return { status: 410, body: { status: "expired" } };
	const ws = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.id, row.workspaceId),
	});
	if (!ws) return { status: 410, body: { status: "expired" } };
	const { token, row: tokenRow } = await issueToken({
		workspaceId: ws.id,
		userId: row.userId,
		name: `CLI on ${new Date(now).toISOString().slice(0, 10)}`,
		scope: "write",
	});
	await db
		.update(schema.cliLogins)
		.set({ apiTokenId: tokenRow.id })
		.where(eq(schema.cliLogins.id, row.id));
	return {
		status: 200,
		body: { token, workspace: { name: ws.name, slug: ws.slug } },
	};
}

export type CliLoginState = "pending" | "approved" | "expired";

export async function cliLoginState(code: string): Promise<CliLoginState> {
	const row = await db.query.cliLogins.findFirst({
		where: eq(schema.cliLogins.userCode, code.toUpperCase()),
	});
	if (row?.approvedAt) return "approved";
	if (!row || row.expiresAt <= Date.now()) return "expired";
	return "pending";
}

// Approve (a workspace) or cancel (null) a pending code. False when the
// code is no longer pending.
export async function decideCliLogin(
	code: string,
	approval: { userId: string; workspaceId: string } | null,
) {
	const now = Date.now();
	const rows = await db
		.update(schema.cliLogins)
		.set(approval ? { ...approval, approvedAt: now } : { expiresAt: now })
		.where(
			and(
				eq(schema.cliLogins.userCode, code.toUpperCase()),
				isNull(schema.cliLogins.approvedAt),
				gt(schema.cliLogins.expiresAt, now),
			),
		)
		.returning({ id: schema.cliLogins.id });
	return rows.length > 0;
}

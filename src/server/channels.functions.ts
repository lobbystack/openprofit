import { randomInt, randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { SMS_CAP } from "#/lib/alerts";
import { APP_NAME } from "#/lib/app";
import { decrypt, encrypt } from "#/lib/crypto";
import { isCloud } from "./billing.server";
import {
	alertSms,
	codeHash,
	endpointProblem,
	isSlackWebhook,
	loadChannels,
	newWebhookSecret,
	type OpenedAlert,
	postSlack,
	postWebhook,
	saveChannels,
	sendSms,
	smsAllowed,
	twilioReady,
} from "./channels.server";
import { currentWorkspace } from "./workspace.server";

export type ChannelsView = {
	slack: boolean;
	webhook: string | null;
	// Null when Twilio isn't configured: the option doesn't show.
	sms: {
		// Hosted Free plan: shown with an upgrade note.
		locked: boolean;
		phone: string | null;
		verified: boolean;
		// SMS sent this month on hosted; null on self-host (no cap).
		sent: number | null;
		cap: number;
	} | null;
};

type Result = { error?: string };

const CODE_TTL = 10 * 60_000;
const CODE_GAP = 60_000;
const CODE_TRIES = 5;
const month = () => new Date().toISOString().slice(0, 7);

const Kind = z.object({ kind: z.enum(["slack", "webhook", "sms"]) });

export const getChannels = createServerFn({ method: "GET" }).handler(
	async (): Promise<ChannelsView> => {
		const ws = await currentWorkspace();
		const ch = await loadChannels(ws.id);
		return {
			slack: !!ch?.slackWebhook,
			webhook: ch?.webhookUrl
				? await decrypt<string>(ch.webhookUrl).catch(() => "")
				: null,
			sms: twilioReady()
				? {
						locked: !smsAllowed(ws),
						phone: ch?.smsPhone ?? null,
						verified: !!ch?.smsVerifiedAt,
						sent: isCloud ? (ch?.smsMonth === month() ? ch.smsCount : 0) : null,
						cap: SMS_CAP,
					}
				: null,
		};
	},
);

export const saveSlack = createServerFn({ method: "POST" })
	.validator(z.object({ url: z.string().trim() }))
	.handler(async ({ data }): Promise<Result> => {
		const ws = await currentWorkspace();
		if (!isSlackWebhook(data.url))
			return {
				error:
					"Paste a Slack webhook URL, starting with https://hooks.slack.com/services/",
			};
		await saveChannels(ws.id, { slackWebhook: await encrypt(data.url) });
		return {};
	});

// Returns the signing secret. It shows once; rotate to get a new one.
export const saveWebhook = createServerFn({ method: "POST" })
	.validator(z.object({ url: z.string().trim().max(2000) }))
	.handler(async ({ data }): Promise<Result & { secret?: string }> => {
		const ws = await currentWorkspace();
		const problem = await endpointProblem(data.url);
		if (problem) return { error: problem };
		const secret = newWebhookSecret();
		await saveChannels(ws.id, {
			webhookUrl: await encrypt(data.url),
			webhookSecret: await encrypt(secret),
		});
		return { secret };
	});

export const rotateWebhookSecret = createServerFn({ method: "POST" }).handler(
	async () => {
		const ws = await currentWorkspace();
		const secret = newWebhookSecret();
		await db
			.update(schema.alertChannels)
			.set({ webhookSecret: await encrypt(secret) })
			.where(eq(schema.alertChannels.workspaceId, ws.id));
		return { secret };
	},
);

// Clears the channel's columns. SMS keeps the month's count and the last
// code's expiry, so removing and adding a number resets neither the cap nor
// the wait between codes.
export const removeChannel = createServerFn({ method: "POST" })
	.validator(Kind)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await saveChannels(
			ws.id,
			data.kind === "slack"
				? { slackWebhook: null }
				: data.kind === "webhook"
					? { webhookUrl: null, webhookSecret: null }
					: { smsPhone: null, smsCodeHash: null, smsVerifiedAt: null },
		);
		return {};
	});

export const testChannel = createServerFn({ method: "POST" })
	.validator(Kind)
	.handler(async ({ data }): Promise<Result> => {
		const ws = await currentWorkspace();
		const ch = await loadChannels(ws.id);
		const sample: OpenedAlert = {
			id: `test_${randomUUID()}`,
			kind: "test",
			title: "Test alert",
			detail: "Alerts from your rules arrive here like this one.",
			openedAt: Date.now(),
		};
		try {
			if (data.kind === "slack" && ch?.slackWebhook)
				await postSlack(await decrypt<string>(ch.slackWebhook), ws, sample);
			else if (data.kind === "webhook" && ch?.webhookUrl && ch.webhookSecret)
				await postWebhook(
					await decrypt<string>(ch.webhookUrl),
					await decrypt<string>(ch.webhookSecret),
					ws,
					sample,
				);
			else if (
				data.kind === "sms" &&
				ch?.smsPhone &&
				ch.smsVerifiedAt &&
				smsAllowed(ws)
			) {
				if ((await sendSms(ws, ch.smsPhone, alertSms(sample))) === "capped")
					return { error: `You've used this month's ${SMS_CAP} SMS.` };
			} else return { error: "Set this channel up first." };
			return {};
		} catch (err) {
			return { error: err instanceof Error ? err.message : String(err) };
		}
	});

// Sends a 6-digit code to the number. It works for 10 minutes and 5 tries;
// a new one can go out a minute after the last.
export const sendSmsCode = createServerFn({ method: "POST" })
	.validator(z.object({ phone: z.string().max(30) }))
	.handler(async ({ data }): Promise<Result> => {
		const ws = await currentWorkspace();
		if (!smsAllowed(ws)) return { error: "SMS isn't available on this plan." };
		const phone = data.phone.replace(/[\s().-]/g, "");
		if (!/^\+[1-9]\d{7,14}$/.test(phone))
			return {
				error: "Enter the number with its country code, like +14155550100.",
			};
		const ch = await loadChannels(ws.id);
		const now = Date.now();
		if (ch?.smsCodeExpiresAt && ch.smsCodeExpiresAt - CODE_TTL + CODE_GAP > now)
			return { error: "Wait a minute before asking for another code." };
		const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
		await saveChannels(ws.id, {
			smsPhone: phone,
			smsVerifiedAt: null,
			smsCodeHash: `${codeHash(ws.id, phone, code)}:0`,
			smsCodeExpiresAt: now + CODE_TTL,
		});
		try {
			const sent = await sendSms(
				ws,
				phone,
				`${APP_NAME} code: ${code}. It expires in 10 minutes.`,
			);
			if (sent === "capped")
				return { error: `You've used this month's ${SMS_CAP} SMS.` };
			return {};
		} catch (err) {
			return { error: err instanceof Error ? err.message : String(err) };
		}
	});

export const confirmSmsCode = createServerFn({ method: "POST" })
	.validator(z.object({ code: z.string().trim().max(20) }))
	.handler(async ({ data }): Promise<Result> => {
		const ws = await currentWorkspace();
		if (!/^\d{6}$/.test(data.code))
			return { error: "Enter the 6 digits from the SMS." };
		const ch = await loadChannels(ws.id);
		if (
			!ch?.smsPhone ||
			!ch.smsCodeHash ||
			!ch.smsCodeExpiresAt ||
			ch.smsCodeExpiresAt < Date.now()
		)
			return { error: "That code expired. Send a new one." };
		const [hash, tries] = ch.smsCodeHash.split(":");
		const next = Number(tries) + 1;
		// Count the try before checking it. The update only lands while the
		// stored value is unchanged, so guesses sent in parallel can't get
		// past the limit.
		const counted = await db
			.update(schema.alertChannels)
			.set({ smsCodeHash: next >= CODE_TRIES ? null : `${hash}:${next}` })
			.where(
				and(
					eq(schema.alertChannels.workspaceId, ws.id),
					eq(schema.alertChannels.smsCodeHash, ch.smsCodeHash),
				),
			)
			.returning({ id: schema.alertChannels.workspaceId });
		if (!counted.length) return { error: "Try that code again." };
		if (codeHash(ws.id, ch.smsPhone, data.code) !== hash)
			return {
				error:
					next >= CODE_TRIES
						? "Too many wrong codes. Send a new one."
						: "That code doesn't match.",
			};
		await saveChannels(ws.id, {
			smsVerifiedAt: Date.now(),
			smsCodeHash: null,
		});
		return {};
	});

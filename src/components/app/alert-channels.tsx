import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useConfirm } from "#/components/app/confirm";
import { SettingsRow } from "#/components/app/shell";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
	type ChannelsView,
	confirmSmsCode,
	removeChannel,
	rotateWebhookSecret,
	saveSlack,
	saveWebhook,
	sendSmsCode,
	testChannel,
} from "#/server/channels.functions";

type Kind = "slack" | "webhook" | "sms";
type Outcome = { error?: string } | undefined;

// Busy flag plus the last message a row's actions left (an error, or
// "Sent" after a test), shown in place of the row's description.
function useAction() {
	const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
	const [busy, setBusy] = useState(false);
	async function run(fn: () => Promise<Outcome>, done?: string) {
		setBusy(true);
		setNote(null);
		try {
			const r = await fn();
			if (r?.error) setNote({ text: r.error, bad: true });
			else if (done) setNote({ text: done, bad: false });
			return !r?.error;
		} catch (err) {
			setNote({
				text: err instanceof Error ? err.message : String(err),
				bad: true,
			});
			return false;
		} finally {
			setBusy(false);
		}
	}
	const say = (fallback: React.ReactNode) =>
		note ? (
			<span className={note.bad ? "text-negative" : undefined}>
				{note.text}
			</span>
		) : (
			fallback
		);
	return { busy, run, say };
}

const REMOVE: Record<Kind, { title: string; description: string }> = {
	slack: {
		title: "Remove Slack?",
		description:
			"OpenProfit deletes the webhook URL and stops posting alerts to Slack.",
	},
	webhook: {
		title: "Remove the webhook?",
		description:
			"OpenProfit deletes the URL and its signing secret and stops sending alerts to it.",
	},
	sms: {
		title: "Remove SMS?",
		description:
			"OpenProfit deletes the number and stops texting alerts. Adding a number again takes a new code.",
	},
};

export function AlertChannels({ channels }: { channels: ChannelsView }) {
	const router = useRouter();
	const [confirm, confirmDialog] = useConfirm();
	const remove = useServerFn(removeChannel);
	const test = useServerFn(testChannel);
	const refresh = () => router.invalidate({ sync: true });

	async function drop(kind: Kind) {
		const ok = await confirm({ ...REMOVE[kind], action: "Remove" });
		if (!ok) return;
		await remove({ data: { kind } });
		await refresh();
	}
	const shared = {
		refresh,
		drop,
		test: (kind: Kind) => test({ data: { kind } }),
	};

	return (
		<>
			{confirmDialog}
			<div className="label-mono mt-8">Channels</div>
			<p className="mt-2 text-[12px] text-text-2">
				Each alert goes to every channel you set up here and to every member by
				email.
			</p>
			<Card className="mt-3 divide-y divide-line">
				<SlackRow on={channels.slack} {...shared} />
				<WebhookRow url={channels.webhook} confirm={confirm} {...shared} />
				{channels.sms && <SmsRow sms={channels.sms} {...shared} />}
			</Card>
		</>
	);
}

type Shared = {
	refresh: () => Promise<void>;
	drop: (kind: Kind) => Promise<void>;
	test: (kind: Kind) => Promise<Outcome>;
};

function Actions({
	kind,
	busy,
	run,
	test,
	drop,
	children,
}: Pick<Shared, "test" | "drop"> & {
	kind: Kind;
	busy: boolean;
	run: ReturnType<typeof useAction>["run"];
	children?: React.ReactNode;
}) {
	return (
		<>
			<Button
				variant="outline"
				disabled={busy}
				onClick={() => run(() => test(kind), "Test sent.")}
			>
				Send test
			</Button>
			{children}
			<Button variant="ghost" onClick={() => drop(kind)}>
				Remove
			</Button>
		</>
	);
}

function SlackRow({ on, refresh, drop, test }: Shared & { on: boolean }) {
	const save = useServerFn(saveSlack);
	const [url, setUrl] = useState("");
	const { busy, run, say } = useAction();
	return (
		<SettingsRow
			label="Slack"
			htmlFor="slack-url"
			description={say(
				on ? (
					"Posts each alert to the Slack channel the webhook belongs to."
				) : (
					<>
						Paste an{" "}
						<a
							href="https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks"
							target="_blank"
							rel="noreferrer"
						>
							incoming webhook
						</a>{" "}
						URL from Slack.
					</>
				),
			)}
		>
			{on ? (
				<Actions kind="slack" busy={busy} run={run} test={test} drop={drop} />
			) : (
				<InlineForm
					busy={busy}
					action="Save"
					onSubmit={async () => {
						if (await run(() => save({ data: { url } }))) {
							setUrl("");
							await refresh();
						}
					}}
				>
					<Input
						size="sm"
						id="slack-url"
						type="url"
						required
						placeholder="https://hooks.slack.com/services/…"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
				</InlineForm>
			)}
		</SettingsRow>
	);
}

function WebhookRow({
	url,
	confirm,
	refresh,
	drop,
	test,
}: Shared & {
	url: string | null;
	confirm: ReturnType<typeof useConfirm>[0];
}) {
	const save = useServerFn(saveWebhook);
	const rotate = useServerFn(rotateWebhookSecret);
	const [draft, setDraft] = useState("");
	// The signing secret, held only until the page reloads.
	const [secret, setSecret] = useState<string | null>(null);
	const { busy, run, say } = useAction();

	async function rotateSecret() {
		const ok = await confirm({
			title: "Rotate the signing secret?",
			description:
				"The current secret stops working now. Your endpoint rejects alerts until it checks them with the new one.",
			action: "Rotate secret",
		});
		if (ok)
			await run(async () => {
				setSecret((await rotate()).secret);
				return {};
			});
	}

	return (
		<>
			<SettingsRow
				label="Webhook"
				htmlFor="webhook-url"
				description={say(
					url ? (
						<span className="break-all">{url}</span>
					) : (
						<>
							Sends each alert as JSON, signed with{" "}
							<Link
								to="/docs/$slug"
								params={{ slug: "alerts" }}
								hash="check-the-webhook-signature"
							>
								Standard Webhooks
							</Link>
							.
						</>
					),
				)}
			>
				{url ? (
					<Actions kind="webhook" busy={busy} run={run} test={test} drop={drop}>
						<Button variant="outline" disabled={busy} onClick={rotateSecret}>
							Rotate secret
						</Button>
					</Actions>
				) : (
					<InlineForm
						busy={busy}
						action="Save"
						onSubmit={async () => {
							await run(async () => {
								const r = await save({ data: { url: draft } });
								if (r.secret) {
									setSecret(r.secret);
									setDraft("");
									await refresh();
								}
								return r;
							});
						}}
					>
						<Input
							size="sm"
							id="webhook-url"
							type="url"
							required
							placeholder="https://example.com/hooks/openprofit"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
						/>
					</InlineForm>
				)}
			</SettingsRow>
			{secret && url && (
				<SettingsRow
					label="Signing secret"
					htmlFor="webhook-secret"
					description="Copy it now. It won't show again."
				>
					<Input
						size="sm"
						id="webhook-secret"
						readOnly
						value={secret}
						className="num"
						onFocus={(e) => e.target.select()}
					/>
					<Button
						variant="outline"
						onClick={() => navigator.clipboard.writeText(secret)}
					>
						Copy
					</Button>
				</SettingsRow>
			)}
		</>
	);
}

function SmsRow({
	sms,
	refresh,
	drop,
	test,
}: Shared & { sms: NonNullable<ChannelsView["sms"]> }) {
	const send = useServerFn(sendSmsCode);
	const verify = useServerFn(confirmSmsCode);
	const [phone, setPhone] = useState("");
	const [code, setCode] = useState("");
	const { busy, run, say } = useAction();
	const used =
		sms.sent === null ? "" : `, ${sms.sent} of ${sms.cap} SMS used this month`;

	if (sms.locked)
		return (
			<SettingsRow
				label="SMS"
				description={
					<>
						SMS alerts come with the Indie and Pro plans.{" "}
						<Link to="/app/settings">Upgrade in Settings</Link>
					</>
				}
			>
				{null}
			</SettingsRow>
		);

	if (sms.phone && sms.verified)
		return (
			<SettingsRow
				label="SMS"
				description={say(
					<>
						Texts each alert to <span className="num">{sms.phone}</span>
						{used}.
					</>,
				)}
			>
				<Actions kind="sms" busy={busy} run={run} test={test} drop={drop} />
			</SettingsRow>
		);

	if (sms.phone)
		return (
			<SettingsRow
				label="SMS"
				htmlFor="sms-code"
				description={say(
					<>
						Enter the code sent to <span className="num">{sms.phone}</span>.
					</>,
				)}
			>
				<InlineForm
					busy={busy}
					action="Verify"
					onSubmit={async () => {
						if (await run(() => verify({ data: { code } }))) {
							setCode("");
							await refresh();
						}
					}}
				>
					<Input
						size="sm"
						id="sms-code"
						inputMode="numeric"
						autoComplete="one-time-code"
						maxLength={6}
						required
						placeholder="123456"
						value={code}
						onChange={(e) => setCode(e.target.value)}
						className="num w-28"
					/>
				</InlineForm>
				<Button
					variant="ghost"
					disabled={busy}
					onClick={() =>
						run(() => send({ data: { phone: sms.phone ?? "" } }), "Code sent.")
					}
				>
					Send again
				</Button>
				<Button variant="ghost" onClick={() => drop("sms")}>
					Remove
				</Button>
			</SettingsRow>
		);

	return (
		<SettingsRow
			label="SMS"
			htmlFor="sms-phone"
			description={say(
				`Texts each alert's title and a link to a verified number${used}.`,
			)}
		>
			<InlineForm
				busy={busy}
				action="Send code"
				onSubmit={async () => {
					if (await run(() => send({ data: { phone } }))) {
						setPhone("");
						await refresh();
					}
				}}
			>
				<Input
					size="sm"
					id="sms-phone"
					type="tel"
					autoComplete="tel"
					required
					placeholder="+14155550100"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					className="num"
				/>
			</InlineForm>
		</SettingsRow>
	);
}

function InlineForm({
	busy,
	action,
	onSubmit,
	children,
}: {
	busy: boolean;
	action: string;
	onSubmit: () => Promise<void>;
	children: React.ReactNode;
}) {
	return (
		<form
			className="flex w-full items-center gap-2 sm:w-auto sm:flex-1"
			onSubmit={(e) => {
				e.preventDefault();
				void onSubmit();
			}}
		>
			{children}
			<Button type="submit" variant="outline" disabled={busy}>
				{action}
			</Button>
		</form>
	);
}

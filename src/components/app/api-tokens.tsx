import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useConfirm } from "#/components/app/confirm";
import { SettingsRow, SettingsSection } from "#/components/app/shell";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import {
	createToken,
	listTokens,
	revokeToken,
	type TokenRow,
} from "#/server/tokens.functions";

const used = (ts: number | null) => {
	if (!ts) return "Never used";
	const days = Math.floor((Date.now() - ts) / 86_400_000);
	return days < 1 ? "Used today" : `Used ${days} d ago`;
};

// Tokens for the MCP endpoint and the CLI, in Settings.
export function ApiTokens() {
	const list = useServerFn(listTokens);
	const create = useServerFn(createToken);
	const revoke = useServerFn(revokeToken);
	const [confirm, confirmDialog] = useConfirm();
	const [tokens, setTokens] = useState<TokenRow[]>([]);
	const [name, setName] = useState("");
	const [scope, setScope] = useState<"read" | "write">("read");
	const [created, setCreated] = useState<string | null>(null);
	const [origin, setOrigin] = useState("");

	useEffect(() => {
		setOrigin(window.location.origin);
		list().then(setTokens);
	}, [list]);

	async function add(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		const { token } = await create({ data: { name, scope } });
		setCreated(token);
		setName("");
		setTokens(await list());
	}

	async function remove(t: TokenRow) {
		const ok = await confirm({
			title: `Revoke ${t.name}?`,
			description:
				"Agents and scripts using it lose access at once. Nothing in the workspace changes.",
			action: "Revoke token",
		});
		if (!ok) return;
		await revoke({ data: { id: t.id } });
		setTokens(await list());
	}

	return (
		<SettingsSection title="API tokens">
			{confirmDialog}
			<SettingsRow
				label="MCP server"
				description={
					<>
						Point your agent at <span className="num">{origin}/mcp</span> and
						send a token as the bearer token.{" "}
						<Link
							to="/docs/$slug"
							params={{ slug: "agents" }}
							className="underline"
						>
							Setup guide
						</Link>
					</>
				}
			>
				<form
					onSubmit={add}
					className="flex w-full flex-wrap gap-2 sm:justify-end"
				>
					<Input
						size="sm"
						aria-label="Token name"
						placeholder="Token name"
						value={name}
						maxLength={60}
						onChange={(e) => setName(e.target.value)}
						className="w-40"
					/>
					<NativeSelect
						size="sm"
						aria-label="Access"
						value={scope}
						onChange={(e) => setScope(e.target.value as "read" | "write")}
					>
						<NativeSelectOption value="read">Read</NativeSelectOption>
						<NativeSelectOption value="write">
							Read and write
						</NativeSelectOption>
					</NativeSelect>
					<Button type="submit" variant="outline" disabled={!name.trim()}>
						Create token
					</Button>
				</form>
			</SettingsRow>
			{created && (
				<SettingsRow
					label="New token"
					description="Copy it now. You won't see it again."
				>
					<span className="num truncate text-[12px]">{created}</span>
					<Button
						variant="quiet"
						size="icon-sm"
						aria-label="Copy token"
						onClick={() => navigator.clipboard.writeText(created)}
					>
						<Copy size={13} />
					</Button>
					<Button
						variant="quiet"
						size="icon-sm"
						aria-label="Hide token"
						onClick={() => setCreated(null)}
					>
						<X size={13} />
					</Button>
				</SettingsRow>
			)}
			{tokens.map((t) => (
				<SettingsRow
					key={t.id}
					label={t.name}
					description={
						<>
							<span className="num">{t.prefix}…</span> ·{" "}
							{t.scope === "write" ? "Read and write" : "Read"} ·{" "}
							{used(t.lastUsedAt)}
						</>
					}
				>
					<Button variant="outline" onClick={() => remove(t)}>
						Revoke
					</Button>
				</SettingsRow>
			))}
		</SettingsSection>
	);
}

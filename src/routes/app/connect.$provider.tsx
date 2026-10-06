import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/app/shell";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import {
	createConnection,
	getConnectorInfo,
	testConnection,
} from "#/server/connections.functions";

export const Route = createFileRoute("/app/connect/$provider")({
	loader: ({ params }) => getConnectorInfo({ data: { id: params.provider } }),
	component: Connect,
});

const field =
	"num h-9 w-full rounded-md border border-line bg-paper px-3 text-[13px] outline-none placeholder:text-text-3 focus:border-line-strong";

function Connect() {
	const info = Route.useLoaderData();
	const navigate = useNavigate();
	const [values, setValues] = useState<Record<string, string>>({});
	const [test, setTest] = useState<
		| { state: "idle" }
		| { state: "testing" }
		| { state: "ok"; label: string }
		| { state: "error"; error: string }
	>({ state: "idle" });
	const [saving, setSaving] = useState(false);
	const complete = info.fields.every(
		(f) => f.optional || values[f.name]?.trim(),
	);
	const logo = PROVIDERS[info.id] ? (
		<ProviderLogo id={info.id as ProviderId} size={16} />
	) : null;

	async function runTest() {
		setTest({ state: "testing" });
		const r = await testConnection({
			data: { provider: info.id, credentials: values },
		});
		setTest(
			r.ok
				? { state: "ok", label: r.label }
				: { state: "error", error: r.error },
		);
	}

	async function save(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		try {
			await createConnection({
				data: { provider: info.id, credentials: values },
			});
			navigate({ to: "/app/connections" });
		} catch (err) {
			setSaving(false);
			setTest({
				state: "error",
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	return (
		<>
			<PageHeader title={info.name} meta={info.kind} />
			<form
				onSubmit={save}
				className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]"
			>
				<div className="rounded-xl border border-line bg-card p-5">
					<div className="flex items-center gap-2 text-[13px]">
						{logo}
						{info.name}
					</div>
					<div className="mt-5 space-y-4">
						{info.fields.map((f) => (
							<label key={f.name} className="block">
								<span className="label-mono">{f.label}</span>
								<input
									type={f.secret ? "password" : "text"}
									autoComplete="off"
									spellCheck={false}
									required={!f.optional}
									value={values[f.name] ?? ""}
									onChange={(e) => {
										setValues({ ...values, [f.name]: e.target.value });
										setTest({ state: "idle" });
									}}
									placeholder={f.placeholder}
									className={`${field} mt-2`}
								/>
							</label>
						))}
					</div>
					<div className="mt-5 flex items-center gap-2">
						<button
							type="button"
							disabled={!complete || test.state === "testing"}
							onClick={runTest}
							className="h-8 rounded-md border border-line bg-paper px-3 text-[13px] hover:border-line-strong disabled:opacity-50"
						>
							{test.state === "testing" ? "Testing…" : "Test"}
						</button>
						<button
							type="submit"
							disabled={test.state !== "ok" || saving}
							className="h-8 rounded-md bg-ink px-3 text-[13px] text-paper hover:bg-ink-2 disabled:opacity-50"
						>
							{saving ? "Connecting…" : "Connect"}
						</button>
						{test.state === "ok" && (
							<span className="flex items-center gap-1.5 text-[12px] text-positive">
								<Check size={14} />
								{test.label}
							</span>
						)}
						{test.state === "error" && (
							<span className="num text-[12px] text-negative">
								{test.error}
							</span>
						)}
					</div>
				</div>

				<div className="rounded-xl border border-line bg-card p-5">
					<a
						href={info.createUrl}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-1 text-[13px] hover:underline"
					>
						Create a key
						<ArrowUpRight size={14} className="text-text-3" />
					</a>
					{info.scopes.length > 0 && (
						<>
							<div className="label-mono mt-5">Permissions</div>
							<ul className="mt-2 space-y-1.5">
								{info.scopes.map((s) => (
									<li key={s} className="num text-[12px] text-text-2">
										{s}
									</li>
								))}
							</ul>
						</>
					)}
				</div>
			</form>
			<Link
				to="/app/connections"
				className="mt-4 inline-block text-[13px] text-text-2 hover:text-ink"
			>
				Back
			</Link>
		</>
	);
}

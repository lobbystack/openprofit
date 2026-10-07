import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/app/shell";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { describeError } from "#/lib/errors";
import {
	createConnection,
	getConnectorInfo,
	testConnection,
} from "#/server/connections.functions";

export const Route = createFileRoute("/app/connect/$provider")({
	head: () => ({ meta: [{ title: "Connect · OpenProfit" }] }),
	loader: ({ params }) => getConnectorInfo({ data: { id: params.provider } }),
	component: Connect,
});

function Connect() {
	const info = Route.useLoaderData();
	const navigate = useNavigate();
	const testFn = useServerFn(testConnection);
	const createFn = useServerFn(createConnection);
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
		const r = await testFn({
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
			await createFn({
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
			<PageHeader
				title={info.name}
				meta={info.kind === "revenue" ? "Revenue" : "Costs"}
			/>
			<form
				onSubmit={save}
				className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]"
			>
				<Card className="p-5">
					<div className="flex items-center gap-2 text-[13px]">
						{logo}
						{info.name}
					</div>
					<FieldGroup className="mt-5">
						{info.fields.map((f) => {
							const props = {
								id: `field-${f.name}`,
								required: !f.optional,
								value: values[f.name] ?? "",
								onChange: (
									e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
								) => {
									setValues({ ...values, [f.name]: e.target.value });
									setTest({ state: "idle" });
								},
								className: "num",
							};
							return (
								<Field key={f.name}>
									<FieldLabel htmlFor={props.id}>{f.label}</FieldLabel>
									{f.options ? (
										<NativeSelect {...props}>
											{f.options.map((o) => (
												<NativeSelectOption key={o.value} value={o.value}>
													{o.label}
												</NativeSelectOption>
											))}
										</NativeSelect>
									) : (
										<Input
											{...props}
											type={f.secret ? "password" : "text"}
											autoComplete="off"
											spellCheck={false}
											placeholder={f.placeholder}
										/>
									)}
								</Field>
							);
						})}
					</FieldGroup>
					<div className="mt-5 flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={!complete || test.state === "testing"}
							onClick={runTest}
						>
							{test.state === "testing" ? "Testing…" : "Test"}
						</Button>
						<Button type="submit" disabled={test.state !== "ok" || saving}>
							{saving ? "Connecting…" : "Connect"}
						</Button>
						{test.state === "ok" && (
							<span className="flex items-center gap-1.5 text-[12px] text-positive">
								<Check size={14} />
								{test.label}
							</span>
						)}
					</div>
					{test.state === "error" && (
						<TestError provider={info.name} error={test.error} />
					)}
				</Card>

				<Card className="p-5">
					<a
						href={info.createUrl}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-1 text-[13px] hover:underline"
					>
						Create a key
						<ArrowUpRight size={14} className="text-text-3" />
					</a>
					<Link
						to="/integrations/$slug"
						params={{ slug: info.id }}
						target="_blank"
						className="mt-2 flex items-center gap-1 text-[13px] hover:underline"
					>
						Setup guide
						<ArrowUpRight size={14} className="text-text-3" />
					</Link>
					<Link
						to="/security"
						target="_blank"
						className="mt-2 flex items-center gap-1 text-[13px] hover:underline"
					>
						How OpenProfit stores your key
						<ArrowUpRight size={14} className="text-text-3" />
					</Link>
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
				</Card>
			</form>
			<Link
				to="/app/connections"
				className="mt-4 inline-block text-[13px] text-text-2 hover:text-ink"
			>
				All connections
			</Link>
		</>
	);
}

// A sentence for the failed test, with the provider's raw answer behind
// "Details".
function TestError({ provider, error }: { provider: string; error: string }) {
	const { text, detail } = describeError(provider, error);
	return (
		<div className="mt-3 text-[12px] text-negative">
			<p>{text}</p>
			{detail && (
				<details className="mt-1 text-text-2">
					<summary className="cursor-pointer">Details</summary>
					<pre className="num mt-1 whitespace-pre-wrap break-all">{detail}</pre>
				</details>
			)}
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";

export const Route = createFileRoute("/app/settings")({ component: Settings });

const FIELDS = [
	["Workspace", "Acme Labs"],
	["Base currency", "USD"],
	["Sync", "Every hour"],
	["Plan", "Indie · $19 / mo"],
	["Weekly email", "Monday 09:00, raphael@acme.dev"],
] as const;

function Settings() {
	return (
		<>
			<PageHeader title="Settings" />
			<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{FIELDS.map(([label, value]) => (
						<li key={label} className="flex h-12 items-center px-4 text-[13px]">
							<span className="w-40 text-text-2">{label}</span>
							<span className="flex-1">{value}</span>
							<span className="text-[12px] text-text-3">Edit</span>
						</li>
					))}
				</ul>
			</div>
		</>
	);
}

import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	Bell,
	Cable,
	Check,
	ChevronsUpDown,
	LayoutGrid,
	LogOut,
	Package,
	Plus,
	Receipt,
	Settings,
	SunMoon,
} from "lucide-react";
import { Logo } from "#/components/logo";
import { buttonVariants } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { FieldContent, FieldDescription } from "#/components/ui/field";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { money } from "#/lib/format";
import { PLANS } from "#/lib/plans";
import { toggleTheme } from "#/lib/theme";
import {
	switchProduct,
	switchWorkspace,
	type WorkspaceSummary,
} from "#/server/workspace.functions";
import { Search } from "./search";

const NAV = [
	{ to: "/app", label: "Overview", icon: LayoutGrid, exact: true },
	{ to: "/app/products", label: "Products", icon: Package },
	{ to: "/app/connections", label: "Connections", icon: Cable },
	{ to: "/app/costs", label: "Costs", icon: Receipt },
	{ to: "/app/alerts", label: "Alerts", icon: Bell },
	{ to: "/app/settings", label: "Settings", icon: Settings },
] as const;

// The public demo's pages: read-only, so no alerts or settings.
const DEMO_NAV = [
	{ to: "/demo", label: "Overview", icon: LayoutGrid, exact: true },
	{ to: "/demo/products", label: "Products", icon: Package },
	{ to: "/demo/connections", label: "Connections", icon: Cable },
	{ to: "/demo/costs", label: "Costs", icon: Receipt },
] as const;

function signOut() {
	authClient.signOut().then(() => {
		window.location.href = "/login";
	});
}

// 240px sidebar, paper background, hairline right border. See design/DESIGN.md.
// `demo`: the public demo at /demo. No workspace, search or account menus,
// and a sign-up bar over the page.
export function Shell({
	workspace,
	demo = false,
	children,
}: {
	workspace: WorkspaceSummary;
	demo?: boolean;
	children: React.ReactNode;
}) {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const nav = demo ? DEMO_NAV : NAV;
	const picked =
		workspace.products.find((p) => p.id === workspace.productId)?.name ?? "All";
	return (
		<div className="flex min-h-screen">
			<aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-paper p-3 md:flex">
				<DropdownMenu>
					<DropdownMenuTrigger className="flex h-9 w-full items-center justify-between rounded-md px-2 text-[13px] hover:bg-surface-2">
						<span className="flex min-w-0 items-center gap-2">
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-ink text-[10px] text-paper">
								{picked[0]}
							</span>
							<span className="truncate">{picked}</span>
						</span>
						<ChevronsUpDown size={14} className="shrink-0 text-text-3" />
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<ProductItems workspace={workspace} demo={demo} />
						<DropdownMenuSeparator />
						<WorkspaceItems workspace={workspace} demo={demo} />
					</DropdownMenuContent>
				</DropdownMenu>

				{!demo && (
					<Search
						pages={NAV}
						products={workspace.products}
						className="mt-2 flex h-8 w-full items-center gap-2 rounded-md border border-line px-2 text-[13px] text-text-3 hover:border-line-strong"
					/>
				)}

				<nav className="mt-5">
					<ul className="space-y-px">
						{nav.map(({ to, label, icon: Icon, ...rest }) => {
							const active =
								"exact" in rest ? path === to : path.startsWith(to);
							return (
								<li key={to}>
									<Link
										to={to}
										className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150 ${
											active
												? "bg-surface-2 text-ink"
												: "text-text-2 hover:bg-surface-1 hover:text-ink"
										}`}
									>
										<Icon size={16} />
										{label}
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>

				{!demo && (
					<div className="mt-auto">
						<DropdownMenu>
							<DropdownMenuTrigger className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-[13px] hover:bg-surface-2">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px]">
									{workspace.email[0]}
								</span>
								<span className="flex-1 truncate text-left text-text-2">
									{workspace.email}
								</span>
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top">
								<AccountItems />
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</aside>

			<div className="min-w-0 flex-1">
				{demo && (
					<div className="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-surface-1 px-4 py-1.5 text-[13px]">
						<span className="text-text-2">
							You're looking at sample numbers for a made-up company.
						</span>
						<Link to="/login" className={buttonVariants({ size: "xs" })}>
							Start free
						</Link>
					</div>
				)}
				{/* Phones: the sidebar's sections as a scrollable bar. */}
				<header className="chrome sticky top-0 z-40 border-b border-line md:hidden">
					<div className="flex h-12 items-center justify-between px-4">
						<Link to={demo ? "/demo" : "/app"}>
							<Logo size={15} />
						</Link>
						{!demo && (
							<DropdownMenu>
								<DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-[12px]">
									{workspace.email[0]}
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									sideOffset={8}
									className="w-56"
								>
									<ProductItems workspace={workspace} />
									<DropdownMenuSeparator />
									<WorkspaceItems workspace={workspace} />
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuLabel>{workspace.email}</DropdownMenuLabel>
										<AccountItems />
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
					<nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
						{nav.map(({ to, label, ...rest }) => {
							const active =
								"exact" in rest ? path === to : path.startsWith(to);
							return (
								<Link
									key={to}
									to={to}
									className={`flex h-8 shrink-0 items-center rounded-md px-3 text-[13px] ${
										active
											? "bg-surface-2 text-ink"
											: "text-text-2 hover:text-ink"
									}`}
								>
									{label}
								</Link>
							);
						})}
					</nav>
				</header>
				<main className="mx-auto max-w-[1024px] p-4 md:p-6">
					{workspace.overCap && (
						<Link
							to="/app/settings"
							className="mb-4 flex h-10 items-center justify-between rounded-md border border-pending px-3 text-[13px]"
						>
							<span>
								Your MRR is over the {PLANS[workspace.plan].name} plan's{" "}
								{money((PLANS[workspace.plan].mrrCapCents ?? 0) / 100)} limit.
								Syncing continues.
							</span>
							<span className="text-text-2">Choose a plan</span>
						</Link>
					)}
					{children}
				</main>
			</div>
		</div>
	);
}

export function PageHeader({
	title,
	meta,
	children,
}: {
	title: string;
	meta?: string;
	children?: React.ReactNode;
}) {
	return (
		// Actions drop under the title when they don't fit beside it.
		<div className="flex min-h-10 flex-wrap items-center justify-between gap-y-2">
			<div className="flex items-baseline gap-3">
				<h1 className="text-[20px]">{title}</h1>
				{meta && <span className="text-[12px] text-text-3">{meta}</span>}
			</div>
			{children && (
				<div className="flex flex-wrap items-center gap-2">{children}</div>
			)}
		</div>
	);
}

// A titled card of settings rows separated by hairlines.
export function SettingsSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="mt-8">
			<h2 className="mb-2 text-[14px]">{title}</h2>
			<Card className="divide-y divide-line">{children}</Card>
		</section>
	);
}

// Label and optional description on the left half, the control on the right
// half. Below 640px the control drops under the label.
export function SettingsRow({
	label,
	description,
	htmlFor,
	children,
}: {
	label: string;
	description?: React.ReactNode;
	// The id of the control, so clicking the label focuses it.
	htmlFor?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2.5 px-4 py-3 sm:min-h-14 sm:flex-row sm:items-center sm:gap-8">
			<FieldContent className="flex-initial sm:w-1/2">
				<Label htmlFor={htmlFor}>{label}</Label>
				{description && <FieldDescription>{description}</FieldDescription>}
			</FieldContent>
			<div className="flex flex-wrap items-center gap-2 sm:w-1/2 sm:justify-end">
				{children}
			</div>
		</div>
	);
}

// All, then each product: the app narrows to the one picked. In the demo
// the pick works too, and adding a product leads to sign-up.
function ProductItems({
	workspace,
	demo = false,
}: {
	workspace: WorkspaceSummary;
	demo?: boolean;
}) {
	const router = useRouter();
	const pick = useServerFn(switchProduct);
	const choose = async (id: string | null) => {
		if (id === workspace.productId) return;
		await pick({ data: { id, demo } });
		await router.invalidate({ sync: true });
	};
	return (
		<DropdownMenuGroup>
			<DropdownMenuLabel>Products</DropdownMenuLabel>
			<DropdownMenuItem onClick={() => choose(null)}>
				<span className="flex-1 truncate">All</span>
				{workspace.productId === null && <Check size={14} />}
			</DropdownMenuItem>
			{workspace.products.map((p) => (
				<DropdownMenuItem key={p.id} onClick={() => choose(p.id)}>
					<span className="flex-1 truncate">{p.name}</span>
					{p.id === workspace.productId && <Check size={14} />}
				</DropdownMenuItem>
			))}
			<DropdownMenuItem
				render={<Link to={demo ? "/login" : "/app/products"} />}
			>
				<Plus size={14} />
				New product
			</DropdownMenuItem>
		</DropdownMenuGroup>
	);
}

// The workspace list with a check on the current one, then "New workspace",
// which leads to sign-up in the demo.
function WorkspaceItems({
	workspace,
	demo = false,
}: {
	workspace: WorkspaceSummary;
	demo?: boolean;
}) {
	const router = useRouter();
	const switchTo = useServerFn(switchWorkspace);
	return (
		<>
			<DropdownMenuGroup>
				<DropdownMenuLabel>Workspaces</DropdownMenuLabel>
				{workspace.workspaces.map((w) => (
					<DropdownMenuItem
						key={w.id}
						onClick={async () => {
							if (w.id === workspace.id) return;
							await switchTo({ data: { id: w.id } });
							router.invalidate();
						}}
					>
						<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-surface-3 text-[10px] text-ink">
							{w.name[0]}
						</span>
						<span className="flex-1 truncate">{w.name}</span>
						{w.id === workspace.id && <Check size={14} />}
					</DropdownMenuItem>
				))}
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuItem
					render={<Link to={demo ? "/login" : "/onboarding"} />}
				>
					<Plus size={14} />
					New workspace
				</DropdownMenuItem>
			</DropdownMenuGroup>
		</>
	);
}

function AccountItems() {
	return (
		<DropdownMenuGroup>
			<DropdownMenuItem onClick={toggleTheme}>
				<SunMoon size={14} />
				Theme
			</DropdownMenuItem>
			<DropdownMenuItem onClick={signOut}>
				<LogOut size={14} />
				Sign out
			</DropdownMenuItem>
		</DropdownMenuGroup>
	);
}

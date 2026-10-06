import { Link, useRouter, useRouterState } from "@tanstack/react-router";
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
	Search,
	Settings,
	SunMoon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "#/components/logo";
import { authClient } from "#/lib/auth-client";
import { money } from "#/lib/format";
import { PLANS } from "#/lib/plans";
import { toggleTheme } from "#/lib/theme";
import {
	switchWorkspace,
	type WorkspaceSummary,
} from "#/server/workspace.functions";

const NAV = [
	{ to: "/app", label: "Overview", icon: LayoutGrid, exact: true },
	{ to: "/app/products", label: "Products", icon: Package },
	{ to: "/app/connections", label: "Connections", icon: Cable },
	{ to: "/app/costs", label: "Costs", icon: Receipt },
	{ to: "/app/alerts", label: "Alerts", icon: Bell },
	{ to: "/app/settings", label: "Settings", icon: Settings },
] as const;

const item =
	"flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-text-2 hover:bg-surface-2 hover:text-ink";

// A button that opens a small panel. Closes on outside click and Escape.
function Menu({
	trigger,
	className,
	panelClassName,
	children,
}: {
	trigger: React.ReactNode;
	className: string;
	panelClassName: string;
	children: (close: () => void) => React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
				className={className}
			>
				{trigger}
			</button>
			{open && (
				<div
					className={`absolute z-50 rounded-lg border border-line bg-paper p-1 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] ${panelClassName}`}
				>
					{children(() => setOpen(false))}
				</div>
			)}
		</div>
	);
}

// 240px sidebar, paper background, hairline right border. See design/DESIGN.md.
export function Shell({
	workspace,
	children,
}: {
	workspace: WorkspaceSummary;
	children: React.ReactNode;
}) {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const router = useRouter();
	return (
		<div className="flex min-h-screen">
			<aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-paper p-3 md:flex">
				<Menu
					className="flex h-9 w-full items-center justify-between rounded-md px-2 text-[13px] hover:bg-surface-2"
					panelClassName="inset-x-0 top-10"
					trigger={
						<>
							<span className="flex min-w-0 items-center gap-2">
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-ink text-[10px] text-paper">
									{workspace.name[0]}
								</span>
								<span className="truncate">{workspace.name}</span>
							</span>
							<ChevronsUpDown size={14} className="shrink-0 text-text-3" />
						</>
					}
				>
					{(close) => (
						<>
							{workspace.workspaces.map((w) => (
								<button
									key={w.id}
									type="button"
									className={item}
									onClick={async () => {
										close();
										if (w.id === workspace.id) return;
										await switchWorkspace({ data: { id: w.id } });
										router.invalidate();
									}}
								>
									<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-surface-3 text-[10px] text-ink">
										{w.name[0]}
									</span>
									<span className="flex-1 truncate">{w.name}</span>
									{w.id === workspace.id && <Check size={14} />}
								</button>
							))}
							<div className="my-1 h-px bg-line" />
							<Link to="/onboarding" className={item} onClick={close}>
								<Plus size={14} />
								New workspace
							</Link>
						</>
					)}
				</Menu>

				<button
					type="button"
					className="mt-2 flex h-8 w-full items-center gap-2 rounded-md border border-line px-2 text-[13px] text-text-3 hover:border-line-strong"
				>
					<Search size={14} />
					<span className="flex-1 text-left">Search</span>
					<span className="label-mono">⌘K</span>
				</button>

				<nav className="mt-5">
					<ul className="space-y-px">
						{NAV.map(({ to, label, icon: Icon, ...rest }) => {
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

				<div className="label-mono mt-6 px-2">Products</div>
				<ul className="mt-2 space-y-px">
					{workspace.products.map((p) => (
						<li key={p.id}>
							<Link
								to="/app/products"
								className="flex h-8 items-center justify-between rounded-md px-2 text-[13px] text-text-2 hover:bg-surface-1 hover:text-ink"
							>
								<span>{p.name}</span>
								<span className="num text-[11px] text-text-3">
									{money(p.profit, { currency: workspace.currency })}
								</span>
							</Link>
						</li>
					))}
				</ul>

				<div className="mt-auto space-y-px">
					<button
						type="button"
						onClick={toggleTheme}
						className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-[13px] text-text-2 hover:bg-surface-1 hover:text-ink"
					>
						<SunMoon size={16} />
						Theme
					</button>
					<Menu
						className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-[13px] hover:bg-surface-2"
						panelClassName="inset-x-0 bottom-10"
						trigger={
							<>
								<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px]">
									{workspace.email[0]}
								</span>
								<span className="flex-1 truncate text-left text-text-2">
									{workspace.email}
								</span>
							</>
						}
					>
						{() => (
							<button
								type="button"
								className={item}
								onClick={() =>
									authClient.signOut().then(() => {
										window.location.href = "/login";
									})
								}
							>
								<LogOut size={14} />
								Sign out
							</button>
						)}
					</Menu>
				</div>
			</aside>

			<div className="min-w-0 flex-1">
				<header className="flex h-12 items-center justify-between border-b border-line px-4 md:hidden">
					<Link to="/app">
						<Logo size={15} />
					</Link>
				</header>
				<main className="mx-auto max-w-[1024px] p-4 md:p-6">
					{workspace.overCap && (
						<Link
							to="/app/settings"
							className="mb-4 flex h-10 items-center justify-between rounded-md border border-pending px-3 text-[13px]"
						>
							<span>
								MRR passed the {PLANS[workspace.plan].name} plan's cap.
							</span>
							<span className="text-text-2">Pick a plan</span>
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
		<div className="flex h-10 items-center justify-between">
			<div className="flex items-baseline gap-3">
				<h1 className="text-[20px]">{title}</h1>
				{meta && <span className="text-[12px] text-text-3">{meta}</span>}
			</div>
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	);
}

export function Control({
	children,
	muted = false,
	onClick,
}: {
	children: React.ReactNode;
	muted?: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex h-8 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 text-[12px] hover:border-line-strong ${
				muted ? "text-text-2" : ""
			}`}
		>
			{children}
		</button>
	);
}

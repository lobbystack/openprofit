import { useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROVIDERS } from "#/components/provider-logo";
import { toggleTheme } from "#/lib/theme";

type Item = { label: string; hint: string; run: () => void };

// ⌘K search over pages, products, connectors and a few actions. A native
// <dialog> gives focus trapping, Escape and the backdrop for free.
export function Search({
	pages,
	products,
	className,
}: {
	pages: readonly { to: string; label: string }[];
	products: { id: string; name: string }[];
	className: string;
}) {
	const navigate = useNavigate();
	const dialog = useRef<HTMLDialogElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);

	const open = () => {
		setQuery("");
		setActive(0);
		dialog.current?.showModal();
		input.current?.focus();
	};
	const close = () => dialog.current?.close();

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				if (dialog.current?.open) close();
				else open();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	});

	const items = useMemo<Item[]>(() => {
		const go = (to: string) => () => navigate({ to });
		return [
			...pages.map((p) => ({ label: p.label, hint: "Page", run: go(p.to) })),
			...products.map((p) => ({
				label: p.name,
				hint: "Product",
				run: go("/app/products"),
			})),
			...Object.entries(PROVIDERS)
				.filter(([, p]) => p.v1)
				.map(([id, p]) => ({
					label: `Connect ${p.name}`,
					hint: "Connection",
					run: () =>
						navigate({
							to: "/app/connect/$provider",
							params: { provider: id },
						}),
				})),
			{ label: "Add a flat cost", hint: "Action", run: go("/app/costs") },
			{ label: "Switch theme", hint: "Action", run: toggleTheme },
			{
				label: "Read the docs",
				hint: "Action",
				run: () => window.open("/docs", "_blank"),
			},
		];
	}, [pages, products, navigate]);

	const q = query.trim().toLowerCase();
	const shown = q
		? items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q))
		: items;
	const pick = (i: Item | undefined) => {
		if (!i) return;
		close();
		i.run();
	};

	return (
		<>
			<button type="button" onClick={open} className={className}>
				<SearchIcon size={14} />
				<span className="flex-1 text-left">Search</span>
				<span className="label-mono">⌘K</span>
			</button>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click; Escape closes it natively */}
			<dialog
				ref={dialog}
				aria-label="Search"
				onClick={(e) => e.target === dialog.current && close()}
				className="menu-panel m-auto mt-[15vh] w-[min(560px,calc(100vw-32px))] rounded-xl border border-line bg-paper p-0 text-ink shadow-[0_16px_48px_-16px_rgb(0_0_0/0.35)] backdrop:bg-black/30"
			>
				<div className="flex items-center gap-2 border-b border-line px-3">
					<SearchIcon size={14} className="text-text-3" />
					<input
						ref={input}
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setActive(0);
						}}
						onKeyDown={(e) => {
							if (e.key === "ArrowDown") {
								e.preventDefault();
								setActive((a) => Math.min(a + 1, shown.length - 1));
							} else if (e.key === "ArrowUp") {
								e.preventDefault();
								setActive((a) => Math.max(a - 1, 0));
							} else if (e.key === "Enter") {
								e.preventDefault();
								pick(shown[active]);
							}
						}}
						placeholder="Pages, products, connections"
						aria-label="Search"
						className="h-11 flex-1 bg-transparent text-[14px] outline-none placeholder:text-text-3"
					/>
				</div>
				<ul className="max-h-[50vh] overflow-y-auto p-1">
					{shown.map((i, n) => (
						<li key={`${i.hint}:${i.label}`}>
							<button
								type="button"
								onMouseMove={() => setActive(n)}
								onClick={() => pick(i)}
								className={`flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[13px] ${n === active ? "bg-surface-2 text-ink" : "text-text-2"}`}
							>
								<span className="truncate">{i.label}</span>
								<span className="text-[12px] text-text-3">{i.hint}</span>
							</button>
						</li>
					))}
					{!shown.length && (
						<li className="px-2 py-3 text-[13px] text-text-3">No results</li>
					)}
				</ul>
			</dialog>
		</>
	);
}

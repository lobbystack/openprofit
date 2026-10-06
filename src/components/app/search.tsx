import { useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PROVIDERS } from "#/components/provider-logo";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "#/components/ui/command";
import { toggleTheme } from "#/lib/theme";

type Item = { label: string; hint: string; run: () => void };

// ⌘K search over pages, products, connectors and a few actions.
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
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const show = () => {
		setQuery("");
		setOpen(true);
	};

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				if (open) setOpen(false);
				else show();
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
	const pick = (i: Item) => {
		setOpen(false);
		i.run();
	};

	return (
		<>
			<button type="button" onClick={show} className={className}>
				<SearchIcon size={14} />
				<span className="flex-1 text-left">Search</span>
				<span className="label-mono">⌘K</span>
			</button>
			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				title="Search"
				description="Pages, products, connections and actions"
			>
				{/* Plain substring match in list order, not cmdk's fuzzy ranking. */}
				<Command shouldFilter={false}>
					<CommandInput
						value={query}
						onValueChange={setQuery}
						placeholder="Pages, products, connections"
					/>
					<CommandList>
						<CommandEmpty>No results</CommandEmpty>
						<CommandGroup>
							{shown.map((i) => (
								<CommandItem
									key={`${i.hint}:${i.label}`}
									value={`${i.hint}:${i.label}`}
									onSelect={() => pick(i)}
								>
									<span className="truncate">{i.label}</span>
									<CommandShortcut>{i.hint}</CommandShortcut>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</>
	);
}

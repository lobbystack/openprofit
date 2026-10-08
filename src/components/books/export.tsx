import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { monthEnd, XERO_TAX_RATE, XERO_TRACKING } from "#/lib/books";
import {
	type getJournalExport,
	saveBookAccounts,
} from "#/server/books-export.functions";

type Options = Awaited<ReturnType<typeof getJournalExport>>;
type Format = "csv" | "quickbooks" | "xero" | "plain";

const FORMATS: Record<Format, { label: string; about: string }> = {
	csv: {
		label: "CSV",
		about: "Revenue, synced costs and flat costs for the month, one line each.",
	},
	quickbooks: {
		label: "QuickBooks journal",
		about:
			"For QuickBooks Online's journal entry import. Your bank feed brings in payouts and costs paid from the company bank account, so this file leaves them out.",
	},
	xero: {
		label: "Xero journal",
		about:
			"For Xero's manual journal import. Your bank feed brings in payouts and costs paid from the company bank account, so this file leaves them out.",
	},
	plain: {
		label: "Plain journal",
		about:
			"All entries, bank account included, with OpenProfit's account names.",
	},
};

const longMonth = (ym: string) =>
	new Date(`${ym}-01T00:00:00Z`).toLocaleString("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});

// The 24 months before this one, newest first: a month exports once it ends.
function pastMonths() {
	const d = new Date();
	d.setUTCDate(1);
	return Array.from({ length: 24 }, () => {
		d.setUTCMonth(d.getUTCMonth() - 1);
		return d.toISOString().slice(0, 7);
	});
}

// The Books page's export: the lines CSV, or the month's journal for
// QuickBooks, Xero or anything else (docs/BOOKS.md, Export dialog).
export function BooksExport({ options }: { options: Options }) {
	const router = useRouter();
	const save = useServerFn(saveBookAccounts);
	const [months] = useState(pastMonths);
	const [format, setFormat] = useState<Format>("csv");
	const [month, setMonth] = useState(months[0]);
	// Unpicked, the product follows the format: the switcher's for CSV, All
	// for journals.
	const [picked, setPicked] = useState<string>();
	const [names, setNames] = useState(options.renames);
	const [dirty, setDirty] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const journal = format !== "csv";
	const product = picked ?? (journal ? "" : (options.productId ?? ""));
	const only: Record<string, string> = product ? { product } : {};
	const url = journal
		? `/api/journal.csv?${new URLSearchParams({ month, format, ...only })}`
		: `/api/export.csv?${new URLSearchParams({ from: `${month}-01`, to: monthEnd(month), ...only })}`;
	const closedAt = options.closed[month];
	// Account names, or Xero's codes plus its tracking category and tax rate.
	const fields = [
		...options.accounts.map((a) => ({
			key: a.key,
			label: a.name,
			placeholder: a.name,
		})),
		...(format === "xero"
			? [
					{
						key: XERO_TRACKING,
						label: "Tracking category",
						placeholder: "Product",
					},
					{ key: XERO_TAX_RATE, label: "Tax rate", placeholder: "" },
				]
			: []),
	];
	const rename = (key: string, value: string) => {
		setNames((n) => ({ ...n, [key]: value }));
		setDirty(true);
	};

	async function download() {
		setBusy(true);
		setError(null);
		try {
			if (journal && dirty) {
				await save({ data: names });
				setDirty(false);
			}
			const res = await fetch(url);
			if (!res.ok) return setError(await res.text());
			const a = document.createElement("a");
			a.href = URL.createObjectURL(await res.blob());
			a.download =
				res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ??
				"openprofit.csv";
			a.click();
			setTimeout(() => URL.revokeObjectURL(a.href));
			// A whole-month journal just closed the month.
			if (journal && !product) await router.invalidate();
		} finally {
			setBusy(false);
		}
	}

	return (
		<Card className="flex flex-wrap items-center justify-between gap-3 p-4">
			<div>
				<h2 className="text-[14px]">Monthly journal</h2>
				<p className="mt-0.5 text-[13px] text-text-2">
					Import a month of entries into QuickBooks, Xero or other accounting
					software.
				</p>
			</div>
			<Dialog>
				<DialogTrigger render={<Button variant="outline" />}>
					<Download size={13} />
					Export
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Export</DialogTitle>
					</DialogHeader>
					<FieldGroup className="gap-3">
						<Field className="gap-1.5">
							<FieldLabel htmlFor="books-format">Format</FieldLabel>
							<NativeSelect
								id="books-format"
								size="sm"
								value={format}
								onChange={(e) => setFormat(e.target.value as Format)}
							>
								{Object.entries(FORMATS).map(([k, f]) => (
									<NativeSelectOption key={k} value={k}>
										{f.label}
									</NativeSelectOption>
								))}
							</NativeSelect>
							<FieldDescription>{FORMATS[format].about}</FieldDescription>
						</Field>
						<Field className="gap-1.5">
							<FieldLabel htmlFor="books-month">Month</FieldLabel>
							<NativeSelect
								id="books-month"
								size="sm"
								value={month}
								onChange={(e) => setMonth(e.target.value)}
							>
								{months.map((m) => (
									<NativeSelectOption key={m} value={m}>
										{longMonth(m)}
									</NativeSelectOption>
								))}
							</NativeSelect>
							{journal && !product && (
								<FieldDescription>
									{closedAt
										? `You closed ${longMonth(month)} on ${new Date(closedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, so you get the same file. Your next export adds any changes since.`
										: `Exporting closes ${longMonth(month)}. If its numbers change later, your next export adds an adjustment.`}
								</FieldDescription>
							)}
						</Field>
						<Field className="gap-1.5">
							<FieldLabel htmlFor="books-product">Product</FieldLabel>
							<NativeSelect
								id="books-product"
								size="sm"
								value={product}
								onChange={(e) => setPicked(e.target.value)}
							>
								<NativeSelectOption value="">All</NativeSelectOption>
								{options.products.map((p) => (
									<NativeSelectOption key={p.id} value={p.id}>
										{p.name}
									</NativeSelectOption>
								))}
							</NativeSelect>
							{journal && product && (
								<FieldDescription>
									Leaves out shared and unassigned costs. Import it into your
									books only if this product is its own company.
								</FieldDescription>
							)}
						</Field>
					</FieldGroup>
					{(format === "quickbooks" || format === "xero") && (
						<details className="text-[13px]">
							<summary className="cursor-pointer">
								{format === "xero" ? "Account codes" : "Account names"}
							</summary>
							<p className="mt-1.5 text-[12px] text-text-2">
								{format === "xero"
									? "Enter the code of each account in your Xero chart of accounts, such as 200."
									: "Match the names in your QuickBooks chart of accounts. Leave a field blank to keep the name shown."}
							</p>
							<div className="mt-2 grid grid-cols-2 items-center gap-x-3 gap-y-1.5">
								{fields.map((f) => (
									<label key={f.key} className="contents">
										<span className="truncate text-text-2">{f.label}</span>
										<Input
											size="sm"
											value={names[f.key] ?? ""}
											placeholder={f.placeholder}
											onChange={(e) => rename(f.key, e.target.value)}
										/>
									</label>
								))}
							</div>
							{format === "xero" && (
								<p className="mt-2 text-[12px] text-text-2">
									For the tax rate, enter one with no tax as your Xero tax
									settings name it, such as Tax Exempt. Sales tax already has
									its own lines.
								</p>
							)}
						</details>
					)}
					{error && <p className="text-[12px] text-negative">{error}</p>}
					<Button
						className="justify-self-start"
						disabled={busy}
						onClick={download}
					>
						Download
					</Button>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

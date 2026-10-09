import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Card, CardHeader, CardTitle } from "#/components/ui/card";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { money } from "#/lib/format";
import type { Form } from "#/lib/tax";
import type { getTaxReport } from "#/server/tax.functions";

type Report = Awaited<ReturnType<typeof getTaxReport>>;
type Part = Report["parts"][number];

const day = (d: string, year = true) =>
	new Date(d).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: year ? "numeric" : undefined,
		timeZone: "UTC",
	});

// The yearly tax report (docs/BOOKS.md): the year's numbers on the lines of
// the form the workspace files.
export function TaxReport({ report }: { report: Report }) {
	const navigate = useNavigate({ from: "/app/books" });
	const fmt = (cents: number) =>
		money(cents / 100, { cents: true, currency: report.currency });
	const split = report.parts.length > 1;
	return (
		<Card className="overflow-hidden">
			<CardHeader className="h-12">
				<CardTitle>Tax report</CardTitle>
				<NativeSelect
					size="sm"
					aria-label="Year"
					className="num w-auto"
					value={report.year}
					onChange={(e) =>
						navigate({
							search: (s) => ({ ...s, year: Number(e.target.value) }),
						})
					}
				>
					{report.years.map((y) => (
						<NativeSelectOption key={y} value={y}>
							{y}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</CardHeader>

			{!report.country && (
				<p className="border-b border-line p-4 text-[13px] text-text-2">
					Pick your country in Books settings below to see the lines of your tax
					form.
				</p>
			)}

			{split && (
				<p className="border-b border-line p-4 text-[13px] text-text-2">
					You incorporated on {day(report.parts[1].from)}. Report the first part
					on your personal return and the second on the company's.
				</p>
			)}

			{report.parts.map((part) => (
				<div key={part.from} className="border-b border-line">
					{split && (
						<h3 className="px-4 pt-4 text-[14px]">
							{day(part.from, false)} to {day(part.to, false)}:{" "}
							{part.incorporated ? "the company" : "your own business"}
						</h3>
					)}
					{part.forms.map((form) => (
						<FormTable key={form.name} form={form} fmt={fmt} />
					))}
					{part.note && <Note>{part.note}</Note>}
					<Equipment
						part={part}
						country={report.country}
						split={split}
						fmt={fmt}
					/>
					{part.election && <Election text={part.election} />}
				</div>
			))}

			<div className="grid gap-2 p-4 text-[13px] text-text-2">
				<p>
					{report.country === "CA"
						? "Keep your invoices for 6 years after the end of the year they cover (CRA guide T4002)."
						: report.country === "US"
							? "Keep your invoices for at least 3 years after you file (IRS Publication 583)."
							: "Keep your invoices as long as your tax authority asks."}
				</p>
				{report.invoices.length > 0 && (
					<p className="flex flex-wrap gap-x-3 gap-y-1">
						<span>Invoices:</span>
						{report.invoices.map((i) => (
							<a
								key={i.url}
								href={i.url}
								target="_blank"
								rel="noreferrer"
								className="text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink"
							>
								{i.name}
							</a>
						))}
					</p>
				)}
				<p className="text-text-3">
					OpenProfit prepares these numbers from your providers. Check them
					before you file; this isn't tax advice.
				</p>
			</div>
		</Card>
	);
}

function Note({ children }: { children: React.ReactNode }) {
	return <p className="px-4 pb-4 text-[12px] text-text-2">{children}</p>;
}

function FormTable({
	form,
	fmt,
}: {
	form: Form;
	fmt: (cents: number) => string;
}) {
	return (
		<section>
			<h4 className="px-4 pt-4 pb-1 text-[13px]">{form.name}</h4>
			<Table>
				<TableBody>
					{form.lines.map((l) => (
						<TableRow
							key={`${l.line}-${l.name}`}
							className="hover:bg-transparent"
						>
							<TableCell className="num w-12 py-2 pr-0 align-top text-text-3 sm:w-16">
								{l.line}
							</TableCell>
							<TableCell className="py-2 align-top">
								{l.name}
								{l.ours && (
									<span className="block text-[12px] text-text-3">
										Our choice: {l.ours}
									</span>
								)}
								{l.items?.map((i) => (
									<span
										key={i.name}
										className="mt-1 flex max-w-80 justify-between gap-4 pl-4 text-[12px] text-text-2"
									>
										<span>{i.name}</span>
										<span className="num">{fmt(i.amount)}</span>
									</span>
								))}
							</TableCell>
							<TableCell className="num py-2 text-right align-top whitespace-nowrap sm:w-36">
								{fmt(l.amount)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{form.note && <Note>{form.note}</Note>}
		</section>
	);
}

function Equipment({
	part,
	country,
	split,
	fmt,
}: {
	part: Part;
	country: string | null;
	split: boolean;
	fmt: (cents: number) => string;
}) {
	if (!part.depreciation.length) return null;
	return (
		<section>
			<h4 className="px-4 pt-4 pb-1 text-[13px]">Equipment</h4>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Item</TableHead>
						<TableHead>Bought</TableHead>
						<TableHead className="text-right">Cost</TableHead>
						<TableHead>Rule</TableHead>
						<TableHead className="text-right">This year</TableHead>
						<TableHead className="text-right">Left</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{part.depreciation.map((r) => (
						<TableRow
							key={`${r.name}-${r.date}`}
							className="hover:bg-transparent"
						>
							<TableCell className="py-2">{r.name}</TableCell>
							<TableCell className="num py-2 whitespace-nowrap">
								{day(r.date)}
							</TableCell>
							<TableCell className="num py-2 text-right">
								{fmt(r.cost)}
							</TableCell>
							<TableCell className="py-2 text-text-2">{r.rule}</TableCell>
							<TableCell className="num py-2 text-right">
								{fmt(r.amount)}
							</TableCell>
							<TableCell className="num py-2 text-right text-text-2">
								{fmt(r.left)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Note>
				{country === "CA"
					? "OpenProfit counts equipment as computers (class 50, 55%). Computers bought after April 15, 2024 and in use before 2027 deduct 100% the first year. The 2025 guide (T4002) calls this proposed; Bill C-15 made it law on March 26, 2026."
					: "Items up to $2,500 go with other expenses under the de minimis safe harbor. Larger items go through Form 4562, with the 100% special depreciation allowance for property acquired after January 19, 2025 (IRS Publication 946)."}
				{split &&
					` The year's depreciation sits in this part, as if the equipment moved to the company on ${day(part.from)}. If you kept it, ask an accountant.`}
				{split &&
					country === "CA" &&
					` The company's first year has ${Math.round((Date.parse(part.to) - Date.parse(part.from)) / 86_400_000) + 1} days, so its CCA is that share of 365.`}
			</Note>
		</section>
	);
}

function Election({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<section className="px-4 pb-4">
			<div className="flex items-center justify-between gap-2 pt-2 pb-1">
				<h4 className="text-[13px]">De minimis election</h4>
				<Button
					variant="outline"
					size="xs"
					onClick={() =>
						navigator.clipboard.writeText(text).then(() => setCopied(true))
					}
				>
					{copied ? "Copied" : "Copy"}
				</Button>
			</div>
			<pre className="overflow-x-auto rounded-md border border-line bg-paper p-3 text-[12px] whitespace-pre-wrap">
				{text}
			</pre>
			<p className="mt-2 text-[12px] text-text-2">
				Fill in the brackets and attach it to your return by its due date,
				extensions included. The election covers the year's items up to $2,500,
				and your books must expense them from January 1.
			</p>
		</section>
	);
}

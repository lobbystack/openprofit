// The yearly tax report's rules (docs/BOOKS.md "Tax report"): equipment
// depreciation and the form line each account lands on. Pure, so the
// December journal entry, the report and the checks share it. Amounts are
// base cents.
// ponytail: US thresholds compare base cents as dollars, right for USD
// workspaces only.

import { ACCOUNTS, type ManualIn } from "./books";

export type Equipment = { name: string; date: string; cost: number };

// One-time manual costs in the equipment category. Bought and in use on
// `starts_on`.
export const equipmentOf = (manual: ManualIn[]): Equipment[] =>
	manual
		.filter((m) => m.category === "equipment" && m.interval === "once")
		.map((m) => ({ name: m.name, date: m.startsOn, cost: m.amount }));

export type DepreciationRow = Equipment & {
	rule: string;
	// This year's deduction: CCA in Canada, depreciation in the US.
	amount: number;
	// Not yet deducted at the end of the year.
	left: number;
	// US: deducted in full under the de minimis safe harbor, so it goes with
	// the other expenses instead of on the depreciation line.
	deMinimis: boolean;
};

const yearOf = (d: string) => Number(d.slice(0, 4));

// Canada: computers are class 50, 55% declining balance (T4002 2025,
// chapter 4, "Class 50 (55%)":
// https://www.canada.ca/content/dam/cra-arc/formspubs/pub/t4002/t4002-25e.pdf).
// The first year, as a multiple of 55% of the cost (Area A columns 15 and
// 17):
// - acquired and in use after April 15, 2024 and before 2027: the class
//   50 factor 9/11 makes it 100%. T4002 2025 calls this proposed; Bill C-15
//   enacted it on March 26, 2026 (https://www.canada.ca/en/department-finance/news/2026/03/legislation-passes-to-implement-budget-2025-canada-strong.html).
//   Québec allows the same for property in use in 2025 or 2026 (TPW-130.G-V
//   8.9 and table 8.13.10:
//   https://www.revenuquebec.ca/en/online-services/forms-and-publications/tpw-130-g-v/capital-cost-allowance-guide/).
// - accelerated investment incentive property acquired after November 20,
//   2018: 1.5 times in use before 2024, and no half-year rule after that
//   (factor 0). Property acquired after 2024 (reaccelerated, in use before
//   2034) also skips the half-year rule; its class 50 factor after 2026
//   isn't published, so it gets the plain rate, never more than allowed.
// - otherwise the half-year rule halves the first year.
// A company's first year shorter than 365 days prorates CCA by days (T4012
// 2025, Schedule 8; T4002 "You were asking?").
// ponytail: one item at a time instead of the class pool, the same numbers
// while nothing in the class is sold. An individual's first year in
// business isn't prorated: the app doesn't know when it started.
const CLASS_50 = 0.55;
const firstYear = (d: string) =>
	d > "2024-04-15" && d < "2027-01-01"
		? 20 / 11
		: d > "2018-11-20" && d < "2024-01-01"
			? 1.5
			: d > "2018-11-20" && d < "2034-01-01"
				? 1
				: 0.5;

function cca(e: Equipment, y: number, incorporatedOn: string | null) {
	let left = e.cost;
	let amount = 0;
	for (let i = yearOf(e.date); i <= y; i++) {
		const rate = CLASS_50 * (i === yearOf(e.date) ? firstYear(e.date) : 1);
		const days =
			incorporatedOn && yearOf(incorporatedOn) === i
				? (Date.parse(`${i + 1}-01-01`) - Date.parse(incorporatedOn)) /
					86_400_000
				: 365;
		amount = Math.round((left * Math.min(rate, 1) * Math.min(days, 365)) / 365);
		left -= amount;
	}
	return { amount, left };
}

// US: up to $2,500 an item is deducted in full under the de minimis safe
// harbor (Schedule C 2025 instructions, Part V; Treas. Reg.
// §1.263(a)-1(f); https://www.irs.gov/instructions/i1040sc). Above it,
// computers are 5-year property (Pub 946 2025, table B-1 class 00.12): the
// special depreciation allowance the year they're placed in service, then
// MACRS half-year convention on the rest (table A-1).
// Special allowance (https://www.irs.gov/publications/p946, chapter 3):
// 100% acquired after January 19, 2025 (P.L. 119-21); 40% earlier in 2025;
// 60% in 2024 and 80% in 2023 (Pub 946 2024 and 2023 editions).
// ponytail: before 2023 counts as 100%, right from September 28, 2017; older
// items finished depreciating before any year this app reports. No
// mid-quarter convention.
const DE_MINIMIS = 250_000;
const MACRS_5 = [0.2, 0.32, 0.192, 0.1152, 0.1152, 0.0576];
const special = (d: string) =>
	d > "2025-01-19"
		? 1
		: d >= "2025"
			? 0.4
			: d >= "2024"
				? 0.6
				: d >= "2023"
					? 0.8
					: 1;

function macrs(e: Equipment, y: number) {
	const bonus = Math.round(e.cost * special(e.date));
	let left = e.cost;
	let amount = 0;
	for (let i = yearOf(e.date); i <= y; i++) {
		const rate = MACRS_5[i - yearOf(e.date)] ?? 0;
		amount = Math.min(
			left,
			(i === yearOf(e.date) ? bonus : 0) + Math.round((e.cost - bonus) * rate),
		);
		left -= amount;
	}
	return { amount, left };
}

// Each piece of equipment's deduction for the year. Nothing outside Canada
// and the US: the rules differ by country.
export function depreciation(
	country: string | null,
	incorporatedOn: string | null,
	equipment: Equipment[],
	y: number,
): DepreciationRow[] {
	const out: DepreciationRow[] = [];
	for (const e of equipment) {
		if (yearOf(e.date) > y) continue;
		const first = yearOf(e.date) === y;
		if (country === "CA") {
			const { amount, left } = cca(e, y, incorporatedOn);
			if (amount)
				out.push({
					...e,
					rule:
						first && firstYear(e.date) > 1.5
							? "Class 50, 100% the first year"
							: "Class 50, 55%",
					amount,
					left,
					deMinimis: false,
				});
		} else if (country === "US" && e.cost <= DE_MINIMIS) {
			if (first)
				out.push({
					...e,
					rule: "De minimis safe harbor",
					amount: e.cost,
					left: 0,
					deMinimis: true,
				});
		} else if (country === "US") {
			const { amount, left } = macrs(e, y);
			const rate = special(e.date);
			if (amount)
				out.push({
					...e,
					rule: !first
						? "5-year MACRS"
						: rate === 1
							? "Special allowance, 100%"
							: `Special allowance, ${rate * 100}%, then 5-year MACRS`,
					amount,
					left,
					deMinimis: false,
				});
		}
	}
	return out;
}

export const total = (rows: { amount: number }[]) =>
	rows.reduce((a, r) => a + r.amount, 0);

// Form lines ---------------------------------------------------------------

export type FormLine = {
	// The form's line number; null on the plain profit and loss.
	line: string | null;
	name: string;
	amount: number;
	// What the line adds up, when it groups several accounts.
	items?: { name: string; amount: number }[];
	// A judgment call: no official guidance names this line. Why we chose it.
	ours?: string;
};

export type Form = { name: string; lines: FormLine[]; note?: string };

const EXPENSES = [
	"payment_fees",
	"ai_apis",
	"hosting",
	"email",
	"software",
	"contractors",
	"other",
	"depreciation",
] as const;
type Expense = (typeof EXPENSES)[number];

export type Amounts = Record<Expense, number> & {
	sales: number;
	refunds: number;
	income: number;
	expenses: number;
	profit: number;
	// Equity moves of an unincorporated business.
	draws: number;
	contributions: number;
	// US: the part of `depreciation` under the de minimis safe harbor.
	deMinimis: number;
};

// Income statement amounts from net debits by account.
export function amounts(t: Record<string, number>, deMinimis = 0): Amounts {
	const get = (k: string) => t[k] ?? 0;
	const e = Object.fromEntries(EXPENSES.map((k) => [k, get(k)])) as Record<
		Expense,
		number
	>;
	const sales = -get("sales");
	const refunds = get("refunds");
	const expenses = EXPENSES.reduce((a, k) => a + e[k], 0);
	return {
		...e,
		sales,
		refunds,
		income: sales - refunds,
		expenses,
		profit: sales - refunds - expenses,
		draws: get("owner_draws"),
		contributions: -get("owner_contributions"),
		deMinimis,
	};
}

// Year-end balances of a company.
export type Balances = {
	cash: number;
	// Money a payment provider holds before paying it out.
	providers: number;
	equipment: number;
	accumulated: number;
	salesTax: number;
	deferred: number;
	founder: number;
	assets: number;
	liabilities: number;
	// Profit since incorporation.
	retained: number;
	// What the business held when it became a company.
	contributed: number;
};

export function balances(
	t: Record<string, number>,
	retained: number,
): Balances {
	const get = (k: string) => t[k] ?? 0;
	const providers = Object.entries(t)
		.filter(([k]) => k.startsWith("balance:"))
		.reduce((a, [, v]) => a + v, 0);
	const b = {
		cash: get("company_bank"),
		providers,
		equipment: get("equipment"),
		accumulated: -get("accumulated_depreciation"),
		salesTax: -get("sales_tax_owed"),
		deferred: -get("deferred_revenue"),
		founder: -get("owed_to_founder"),
	};
	const assets = b.cash + b.providers + b.equipment - b.accumulated;
	const liabilities = b.salesTax + b.deferred + b.founder;
	return {
		...b,
		assets,
		liabilities,
		retained,
		contributed: assets - liabilities - retained,
	};
}

const sum = (a: Amounts, keys: readonly Expense[]) =>
	keys.reduce((s, k) => s + a[k], 0);
const itemize = (a: Amounts, keys: readonly Expense[]) =>
	keys
		.filter((k) => a[k])
		.map((k) => ({ name: ACCOUNTS[k].name, amount: a[k] }));
const line = (
	n: string | null,
	name: string,
	amount: number,
	extra: Partial<FormLine> = {},
): FormLine => ({ line: n, name, amount, ...extra });
const deMinimisItem = (a: Amounts) =>
	a.deMinimis
		? [{ name: "Equipment, de minimis safe harbor", amount: a.deMinimis }]
		: [];

// Canada, not incorporated: T2125 2025 and its guide T4002 2025.
// https://www.canada.ca/content/dam/cra-arc/formspubs/pbg/t2125/t2125-25e.pdf
// https://www.canada.ca/content/dam/cra-arc/formspubs/pub/t4002/t4002-25e.pdf
// (8860 covers "external professional advice, services and consulting
// fees"; 9270 "other expenses ... as long as you did not include them on a
// previous line"; Part 9, details of equity)
const T2125_OTHER = [
	"ai_apis",
	"hosting",
	"email",
	"software",
	"other",
] as const;
export function t2125(a: Amounts): Form {
	return {
		name: "T2125",
		lines: [
			line("3A", "Gross sales, commissions, or fees", a.sales),
			line(
				"3B",
				"GST/HST, provincial sales tax, returns, allowances, discounts",
				a.refunds,
			),
			line("8000", "Adjusted gross sales", a.income),
			line("8710", "Interest and bank charges", a.payment_fees, {
				ours: "No line names payment processing fees; this one covers bank charges.",
			}),
			line(
				"8860",
				"Professional fees (includes legal and accounting fees)",
				a.contractors,
			),
			line("9936", "Capital cost allowance (CCA)", a.depreciation),
			line("9270", "Other expenses", sum(a, T2125_OTHER), {
				items: itemize(a, T2125_OTHER),
				ours: "No line names AI, hosting or software; 9270 takes what no other line covers.",
			}),
			line("9368", "Total expenses", a.expenses),
			line("9369", "Net income (loss) before adjustments", a.profit),
			line("9932", "Drawings in the current year", a.draws),
			line(
				"9933",
				"Capital contributions in the current year",
				a.contributions,
			),
		],
		note: "Sales leave out GST/HST and QST, so 3B holds only refunds. If you collected sales tax, add it to both.",
	};
}

// Québec, not incorporated: TP-80-V (2025-10) and its guide IN-155-V
// (2025-12).
// https://www.revenuquebec.ca/documents/en/formulaires/tp/TP-80-V(2025-10).pdf
// https://www.revenuquebec.ca/documents/en/publications/in/IN-155-V(2025-12).pdf
// (6.10: "management and administration fees, as well as bank charges";
// 6.24: line 246 takes "the deductions that you cannot deduct elsewhere")
const TP80_OTHER = [
	"ai_apis",
	"hosting",
	"email",
	"software",
	"contractors",
	"other",
] as const;
export function tp80(a: Amounts): Form {
	return {
		name: "TP-80-V",
		lines: [
			line("110", "Sales, commissions or professional fees", a.sales),
			line("113", "Sales returns, allowances and discounts", a.refunds),
			line("130", "Gross income", a.income),
			line("216", "Management and administration fees", a.payment_fees, {
				ours: "The guide puts bank charges here; payment fees are the closest.",
			}),
			line("240", "Capital cost allowance", a.depreciation),
			line("246", "Other expenses", sum(a, TP80_OTHER), {
				items: itemize(a, TP80_OTHER),
				ours: "No line names AI, hosting, software or contractors; 246 takes what no other line covers.",
			}),
			line("248", "Expenses related to your business activities", a.expenses),
			line("250", "Line 148 minus line 248", a.profit),
			line("73", "Drawings during the fiscal period", a.draws),
			line("75", "Investments during the fiscal period", a.contributions),
		],
	};
}

// Canada, incorporated: GIFI schedules 125 and 100 (RC4088 Rev. 23).
// https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4088/general-index-financial-information-gifi.html
// (8670 includes "amounts referred to as depreciation"; 9110 "contract
// labour, contract work"; 2680 includes GST/HST; 2770 "unearned income";
// negative amounts take a minus sign; whole dollars)
// Québec corporations file the same GIFI with the CO-17 (CO-17.G 2025-07,
// 3.6.1: https://www.revenuquebec.ca/documents/fr/formulaires/co/CO-17.G(2025-07).pdf).
const GIFI_COMPUTER = ["ai_apis", "hosting", "email", "software"] as const;
export function gifi125(a: Amounts): Form {
	return {
		name: "GIFI, Schedule 125",
		lines: [
			line("8000", "Trade sales of goods and services", a.income),
			line("8299", "Total revenue", a.income),
			line("8670", "Amortization of tangible assets", a.depreciation),
			line("8716", "Credit card charges", a.payment_fees, {
				ours: "No code names payment processing fees; card charges is the closest.",
			}),
			line("9110", "Sub-contracts", a.contractors),
			line("9150", "Computer-related expenses", sum(a, GIFI_COMPUTER), {
				items: itemize(a, GIFI_COMPUTER),
				ours: "No code names AI, hosting or software services; these are the company's computer costs.",
			}),
			line("9270", "Other expenses", a.other),
			line("9368", "Total expenses", a.expenses),
			line(
				"9970",
				"Net income/loss before taxes and extraordinary items",
				a.profit,
			),
		],
		note: "GIFI takes whole dollars. Line 9999 is this amount after the company's income tax. Claim the CCA on Schedule 8.",
	};
}

export function gifi100(b: Balances): Form {
	return {
		name: "GIFI, Schedule 100, end of year",
		lines: [
			line("1001", "Cash", b.cash),
			line("1480", "Other current assets", b.providers, {
				ours: "No code names money a payment provider holds before paying it out.",
			}),
			line("1774", "Computer equipment/software", b.equipment),
			line(
				"1775",
				"Accumulated amortization of computer equipment/software",
				-b.accumulated,
			),
			line("2599", "Total assets", b.assets),
			line("2680", "Taxes payable", b.salesTax),
			line("2770", "Deferred income", b.deferred),
			line("2781", "Due to individual shareholder(s)", b.founder),
			line("3499", "Total liabilities", b.liabilities),
			...(b.contributed
				? [
						line("3541", "Contributed surplus", b.contributed, {
							ours: "What the business held when it became a company. Ask an accountant how the transfer was recorded.",
						}),
					]
				: []),
			line("3600", "Retained earnings/deficit", b.retained),
			line("3620", "Total shareholder equity", b.contributed + b.retained),
			line(
				"3640",
				"Total liabilities and shareholder equity",
				b.liabilities + b.contributed + b.retained,
			),
		],
	};
}

// US, not incorporated: Schedule C (Form 1040) 2025.
// https://www.irs.gov/pub/irs-pdf/f1040sc.pdf (lines)
// https://www.irs.gov/instructions/i1040sc (line 11: "payments to persons you
// do not treat as employees (for example, independent contractors)"; Part
// V: de minimis amounts and "subscription services paid to manage your
// business")
const SCHEDULE_C_OTHER = [
	"payment_fees",
	"ai_apis",
	"hosting",
	"email",
	"software",
	"other",
] as const;
export function scheduleC(a: Amounts): Form {
	return {
		name: "Schedule C (Form 1040)",
		lines: [
			line("1", "Gross receipts or sales", a.sales),
			line("2", "Returns and allowances", a.refunds),
			line("7", "Gross income", a.income),
			line("11", "Contract labor", a.contractors),
			line(
				"13",
				"Depreciation and section 179 expense deduction",
				a.depreciation - a.deMinimis,
			),
			line(
				"27b",
				"Other expenses (from line 48)",
				sum(a, SCHEDULE_C_OTHER) + a.deMinimis,
				{
					items: [...itemize(a, SCHEDULE_C_OTHER), ...deMinimisItem(a)],
					ours: "No line names payment fees, AI or hosting; Part V lists what no other line covers.",
				},
			),
			line(
				"28",
				"Total expenses before expenses for business use of home",
				a.expenses,
			),
			line("29", "Tentative profit or (loss)", a.profit),
		],
		note: "List each item of line 27b in Part V. Depreciation goes through Form 4562.",
	};
}

// US, incorporated: Form 1120 2025, and Schedule L when receipts or assets
// reach $250,000 (Schedule K question 13).
// https://www.irs.gov/pub/irs-pdf/f1120.pdf
// https://www.irs.gov/pub/irs-pdf/f1120s.pdf (lines 1a-1c, 14, 20, 21, 22)
// https://www.irs.gov/pub/irs-pdf/f1065.pdf (lines 1a-1c, 16a, 21, 22, 23;
// Schedule B question 4: receipts under $250,000 and assets under $1
// million, among other conditions)
const F1120_OTHER = [
	"payment_fees",
	"ai_apis",
	"hosting",
	"email",
	"software",
	"contractors",
	"other",
] as const;
export const SCHEDULE_L_LIMIT = 25_000_000;
export function form1120(a: Amounts): Form {
	return {
		name: "Form 1120",
		lines: [
			line("1a", "Gross receipts or sales", a.sales),
			line("1b", "Returns and allowances", a.refunds),
			line("1c", "Balance", a.income),
			line("20", "Depreciation from Form 4562", a.depreciation - a.deMinimis),
			line(
				"26",
				"Other deductions (attach statement)",
				sum(a, F1120_OTHER) + a.deMinimis,
				{
					items: [...itemize(a, F1120_OTHER), ...deMinimisItem(a)],
					ours: "Form 1120 has no line for these costs; line 26 takes deductions not claimed elsewhere.",
				},
			),
			line("27", "Total deductions", a.expenses),
			line(
				"28",
				"Taxable income before net operating loss deduction and special deductions",
				a.profit,
			),
		],
		note: "An S corporation uses the same amounts on Form 1120-S: lines 1a to 1c, 14 (depreciation), 20 (other deductions), 21 and 22. A partnership uses Form 1065: lines 1a to 1c, 16a, 21, 22 and 23.",
	};
}

export function scheduleL(b: Balances): Form {
	return {
		name: "Schedule L (Form 1120), end of year",
		lines: [
			line("1", "Cash", b.cash),
			line("6", "Other current assets", b.providers, {
				ours: "Money a payment provider holds before paying it out has no line of its own.",
			}),
			line("10a", "Buildings and other depreciable assets", b.equipment),
			line("10b", "Less accumulated depreciation", b.accumulated),
			line("15", "Total assets", b.assets),
			line("18", "Other current liabilities", b.salesTax + b.deferred, {
				items: [
					{ name: ACCOUNTS.sales_tax_owed.name, amount: b.salesTax },
					{ name: ACCOUNTS.deferred_revenue.name, amount: b.deferred },
				].filter((i) => i.amount),
				ours: "No line names sales tax owed or revenue paid in advance.",
			}),
			line("19", "Loans from shareholders", b.founder),
			...(b.contributed
				? [
						line("23", "Additional paid-in capital", b.contributed, {
							ours: "What the business held when it became a company. Ask an accountant how the transfer was recorded.",
						}),
					]
				: []),
			line("25", "Retained earnings, unappropriated", b.retained),
			line(
				"28",
				"Total liabilities and shareholders' equity",
				b.liabilities + b.contributed + b.retained,
			),
		],
		note: "Form 1120-S and Form 1065 have the same balance sheet under other line numbers.",
	};
}

// Anywhere else: a plain profit and loss by account.
export function profitAndLoss(a: Amounts): Form {
	return {
		name: "Profit and loss",
		lines: [
			line(null, "Sales", a.sales),
			line(null, "Refunds", a.refunds),
			line(null, "Net sales", a.income),
			...EXPENSES.filter((k) => k !== "depreciation").map((k) =>
				line(null, ACCOUNTS[k].name, a[k]),
			),
			line(null, "Total expenses", a.expenses),
			line(null, "Profit", a.profit),
		],
		note: "Equipment stays out of these numbers: depreciation follows your country's rules.",
	};
}

// The de minimis election (Treas. Reg. §1.263(a)-1(f)(5)). The IRS asks
// for a statement with this title, the taxpayer's name, address and TIN,
// and a statement that they make the election, attached to a timely filed
// original return including extensions.
// https://www.irs.gov/businesses/small-businesses-self-employed/tangible-property-final-regulations
export const deMinimisElection = (y: number) =>
	[
		"Section 1.263(a)-1(f) de minimis safe harbor election",
		"",
		"Name: [your name or the company's name]",
		"Address: [address]",
		"Taxpayer identification number: [SSN or EIN]",
		"",
		`The taxpayer is making the de minimis safe harbor election under Treas. Reg. section 1.263(a)-1(f) for the tax year ending December 31, ${y}.`,
	].join("\n");

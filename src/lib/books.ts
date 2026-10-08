// The books: accounts and the monthly journal (docs/BOOKS.md). Pure, so the
// export, the tax report and the checks share one implementation. Amounts
// are base cents.

export type AccountType =
	| "asset"
	| "liability"
	| "equity"
	| "income"
	| "expense";

export const ACCOUNTS = {
	company_bank: { name: "Company bank", type: "asset" },
	equipment: { name: "Equipment", type: "asset" },
	accumulated_depreciation: {
		name: "Accumulated depreciation",
		type: "asset",
	},
	sales_tax_owed: { name: "Sales tax owed", type: "liability" },
	deferred_revenue: { name: "Deferred revenue", type: "liability" },
	owed_to_founder: { name: "Owed to founder", type: "liability" },
	owner_contributions: { name: "Owner contributions", type: "equity" },
	owner_draws: { name: "Owner draws", type: "equity" },
	sales: { name: "Sales", type: "income" },
	refunds: { name: "Refunds", type: "income" },
	payment_fees: { name: "Payment fees", type: "expense" },
	ai_apis: { name: "AI and APIs", type: "expense" },
	hosting: { name: "Hosting", type: "expense" },
	email: { name: "Email", type: "expense" },
	software: { name: "Software", type: "expense" },
	contractors: { name: "Contractors", type: "expense" },
	other: { name: "Other expenses", type: "expense" },
	depreciation: { name: "Depreciation", type: "expense" },
} as const satisfies Record<string, { name: string; type: AccountType }>;

export type FixedAccount = keyof typeof ACCOUNTS;
// A fixed account, or `balance:<provider>`.
export type Account = FixedAccount | `balance:${string}`;

export const EXPENSE_CATEGORIES = [
	"ai_apis",
	"hosting",
	"email",
	"software",
	"contractors",
	"other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type CostCategory = ExpenseCategory | "equipment";

const PROVIDER_ACCOUNT: Record<string, ExpenseCategory> = {
	openai: "ai_apis",
	anthropic: "ai_apis",
	openrouter: "ai_apis",
	xai: "ai_apis",
	firecrawl: "ai_apis",
	twilio: "ai_apis",
	vercel: "hosting",
	railway: "hosting",
	cloudflare: "hosting",
	digitalocean: "hosting",
	neon: "hosting",
	mongodb: "hosting",
	supabase: "hosting",
	resend: "email",
	github: "software",
};

export const expenseAccount = (provider: string): ExpenseCategory =>
	PROVIDER_ACCOUNT[provider] ?? "other";

export function accountType(account: Account): AccountType {
	return account.startsWith("balance:")
		? "asset"
		: ACCOUNTS[account as FixedAccount].type;
}

// Default name, or the user's rename for their accounting software.
export function accountName(
	account: Account,
	renames: Record<string, string> | null | undefined,
	providerName: (id: string) => string,
) {
	if (renames?.[account]) return renames[account];
	return account.startsWith("balance:")
		? `${providerName(account.slice(8))} balance`
		: ACCOUNTS[account as FixedAccount].name;
}

export type Method = "personal" | "company";

// Who paid, on a date: owner contributions before incorporation, then the
// founder (personal card) or the company. `since` flips the method: before
// it, the other one applied.
export function payer(
	date: string,
	incorporatedOn: string | null,
	method: Method,
	since: string | null,
): Account {
	if (!incorporatedOn || date < incorporatedOn) return "owner_contributions";
	const m =
		since && date < since
			? method === "personal"
				? "company"
				: "personal"
			: method;
	return m === "personal" ? "owed_to_founder" : "company_bank";
}

export type Line = {
	account: Account;
	productId: string | null;
	debit: number;
	credit: number;
};

export type Entry = {
	date: string;
	memo: string;
	// Groups entries for the monthly summary (one per source and product).
	group: string;
	// Moves money in or out of the company bank account. The QuickBooks and
	// Xero formats leave these to the bank feed.
	bank: boolean;
	lines: Line[];
};

export type RevenueIn = {
	date: string;
	provider: string;
	productId: string | null;
	gross: number;
	fees: number;
	refunds: number;
	tax: number;
	// The provider files the tax (merchant of record): none in the books.
	remitsTax: boolean;
	serviceStart: string | null;
	serviceEnd: string | null;
};

export type CostIn = {
	date: string;
	provider: string;
	productId: string | null;
	amount: number;
	method: Method;
	since: string | null;
};

export type PayoutIn = { date: string; provider: string; amount: number };

export type ManualIn = {
	name: string;
	productId: string | null;
	// Base cents: the monthly amount for `month`, the yearly amount for
	// `year` (booked a twelfth a month), the whole cost for `once`.
	amount: number;
	interval: "month" | "year" | "once";
	startsOn: string;
	endsOn: string | null;
	category: CostCategory;
	method: Method;
	since: string | null;
};

export type BooksIn = {
	// YYYY-MM.
	month: string;
	incorporatedOn: string | null;
	providerName: (id: string) => string;
	// Lines paid in the month, and lines whose service period reaches it.
	revenue: RevenueIn[];
	costs: CostIn[];
	payouts: PayoutIn[];
	manual: ManualIn[];
	// December only: the year's depreciation from the tax rules.
	depreciation?: number;
};

const DAY = 86_400_000;
const days = (a: string, b: string) =>
	Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const nextMonth = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
};
export const monthEnd = (m: string) =>
	new Date(Date.parse(`${nextMonth(m)}-01`) - DAY).toISOString().slice(0, 10);

// Gross earned from `start` up to `until`, rounded so the months add up to
// gross exactly.
function earnedBy(r: RevenueIn, until: string) {
	if (!r.serviceStart || !r.serviceEnd) return until > r.date ? r.gross : 0;
	const total = days(r.serviceStart, r.serviceEnd);
	if (total <= 0) return until > r.serviceStart ? r.gross : 0;
	const done = Math.min(Math.max(days(r.serviceStart, until), 0), total);
	return Math.round((r.gross * done) / total);
}

const entry = (
	date: string,
	memo: string,
	group: string,
	lines: Line[],
	bank = false,
): Entry => ({
	date,
	memo,
	group,
	bank,
	lines: lines.filter((l) => l.debit || l.credit),
});

export function journal(input: BooksIn): Entry[] {
	const { month, incorporatedOn } = input;
	const name = input.providerName;
	const first = `${month}-01`;
	const last = monthEnd(month);
	const after = `${nextMonth(month)}-01`;
	const inMonth = (d: string) => d >= first && d < after;
	const out: Entry[] = [];

	for (const r of input.revenue) {
		const balance: Account = `balance:${r.provider}`;
		const tax = r.remitsTax ? 0 : r.tax;
		const deferred = Boolean(r.serviceStart && r.serviceEnd);
		if (inMonth(r.date)) {
			out.push(
				entry(r.date, `${name(r.provider)} payments`, `pay:${r.provider}`, [
					{
						account: balance,
						productId: r.productId,
						debit: r.gross - r.refunds - r.fees + tax,
						credit: 0,
					},
					{
						account: "payment_fees",
						productId: r.productId,
						debit: r.fees,
						credit: 0,
					},
					{
						account: "refunds",
						productId: r.productId,
						debit: r.refunds,
						credit: 0,
					},
					{
						account: deferred ? "deferred_revenue" : "sales",
						productId: r.productId,
						debit: 0,
						credit: r.gross,
					},
					{
						account: "sales_tax_owed",
						productId: r.productId,
						debit: 0,
						credit: tax,
					},
				]),
			);
		}
		if (deferred) {
			const earned = earnedBy(r, after) - earnedBy(r, first);
			if (earned)
				out.push(
					entry(
						last,
						`${name(r.provider)} revenue earned`,
						`earn:${r.provider}`,
						[
							{
								account: "deferred_revenue",
								productId: r.productId,
								debit: earned,
								credit: 0,
							},
							{
								account: "sales",
								productId: r.productId,
								debit: 0,
								credit: earned,
							},
						],
					),
				);
		}
	}

	for (const p of input.payouts) {
		if (!inMonth(p.date)) continue;
		const incorporated = Boolean(incorporatedOn && p.date >= incorporatedOn);
		out.push(
			entry(
				p.date,
				`${name(p.provider)} payout`,
				`payout:${p.provider}`,
				[
					{
						account: incorporated ? "company_bank" : "owner_draws",
						productId: null,
						debit: p.amount,
						credit: 0,
					},
					{
						account: `balance:${p.provider}`,
						productId: null,
						debit: 0,
						credit: p.amount,
					},
				],
				incorporated,
			),
		);
	}

	for (const c of input.costs) {
		if (!inMonth(c.date)) continue;
		const expense = expenseAccount(c.provider);
		const paidBy = payer(c.date, incorporatedOn, c.method, c.since);
		const group = `cost:${c.provider}`;
		if (paidBy === "company_bank") {
			out.push(
				entry(c.date, `${name(c.provider)} usage`, group, [
					{
						account: expense,
						productId: c.productId,
						debit: c.amount,
						credit: 0,
					},
					{
						account: `balance:${c.provider}`,
						productId: c.productId,
						debit: 0,
						credit: c.amount,
					},
				]),
				entry(
					c.date,
					`${name(c.provider)} paid by the company`,
					`paid:${c.provider}`,
					[
						{
							account: `balance:${c.provider}`,
							productId: c.productId,
							debit: c.amount,
							credit: 0,
						},
						{
							account: "company_bank",
							productId: c.productId,
							debit: 0,
							credit: c.amount,
						},
					],
					true,
				),
			);
		} else {
			out.push(
				entry(c.date, `${name(c.provider)} usage`, group, [
					{
						account: expense,
						productId: c.productId,
						debit: c.amount,
						credit: 0,
					},
					{
						account: paidBy,
						productId: c.productId,
						debit: 0,
						credit: c.amount,
					},
				]),
			);
		}
	}

	for (const m of input.manual) {
		let amount = 0;
		let date = last;
		if (m.interval === "once") {
			if (!inMonth(m.startsOn)) continue;
			amount = m.amount;
			date = m.startsOn;
		} else {
			const active =
				m.startsOn.slice(0, 7) <= month &&
				(!m.endsOn || m.endsOn.slice(0, 7) >= month);
			if (!active) continue;
			amount = m.interval === "year" ? Math.round(m.amount / 12) : m.amount;
		}
		if (!amount) continue;
		const paidBy = payer(date, incorporatedOn, m.method, m.since);
		out.push(
			entry(
				date,
				m.name,
				`manual:${m.name}`,
				[
					{
						account: m.category,
						productId: m.productId,
						debit: amount,
						credit: 0,
					},
					{ account: paidBy, productId: m.productId, debit: 0, credit: amount },
				],
				paidBy === "company_bank",
			),
		);
	}

	if (input.depreciation && month.endsWith("-12")) {
		out.push(
			entry(last, "Depreciation for the year", "depreciation", [
				{
					account: "depreciation",
					productId: null,
					debit: input.depreciation,
					credit: 0,
				},
				{
					account: "accumulated_depreciation",
					productId: null,
					debit: 0,
					credit: input.depreciation,
				},
			]),
		);
	}
	return out;
}

// One entry per group, dated the end of the month: what the journal formats
// export (one line per account and product).
export function summarize(entries: Entry[], month: string): Entry[] {
	const groups = new Map<string, Entry>();
	for (const e of entries) {
		const g = groups.get(e.group) ?? {
			date: monthEnd(month),
			memo: e.memo,
			group: e.group,
			bank: e.bank,
			lines: [],
		};
		for (const l of e.lines) {
			const same = g.lines.find(
				(x) => x.account === l.account && x.productId === l.productId,
			);
			if (same) {
				same.debit += l.debit;
				same.credit += l.credit;
			} else g.lines.push({ ...l });
		}
		groups.set(e.group, g);
	}
	// A line's debit and credit net to one side.
	return [...groups.values()].map((g) => ({
		...g,
		lines: g.lines
			.map((l) => {
				const net = l.debit - l.credit;
				return { ...l, debit: Math.max(net, 0), credit: Math.max(-net, 0) };
			})
			.filter((l) => l.debit || l.credit),
	}));
}

// Net debit per entry kind, account and product, as stored when a month is
// exported. Bank entries are kept apart so the QuickBooks and Xero formats
// can leave their changes to the bank feed too.
export function totals(entries: Entry[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const e of entries)
		for (const l of e.lines) {
			const k = `${e.bank ? "bank" : "book"}|${l.account}|${l.productId ?? ""}`;
			out[k] = (out[k] ?? 0) + l.debit - l.credit;
		}
	return out;
}

// What changed in a closed month since it was exported: one balanced entry
// for the book side and one for the bank side, so formats that leave the
// bank account to the bank feed can drop the second.
export function adjustments(
	exported: Record<string, number>,
	now: Record<string, number>,
	date: string,
	closedMonth: string,
): Entry[] {
	const out: Entry[] = [];
	for (const kind of ["book", "bank"] as const) {
		const lines: Line[] = [];
		for (const k of new Set([...Object.keys(exported), ...Object.keys(now)])) {
			const [kk, account, productId] = k.split("|");
			if (kk !== kind) continue;
			const delta = (now[k] ?? 0) - (exported[k] ?? 0);
			if (!delta) continue;
			lines.push({
				account: account as Account,
				productId: productId || null,
				debit: Math.max(delta, 0),
				credit: Math.max(-delta, 0),
			});
		}
		if (lines.length)
			out.push({
				date,
				memo: `Changes to ${closedMonth} after it was exported`,
				group: `adjust:${closedMonth}`,
				bank: kind === "bank",
				lines,
			});
	}
	return out;
}

export const balanced = (e: Entry) =>
	e.lines.reduce((a, l) => a + l.debit - l.credit, 0) === 0;

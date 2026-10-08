# Books

OpenProfit keeps the books for a solo software founder from the data it already syncs: a monthly journal you import into QuickBooks, Xero or any accounting software, and a yearly report on the lines of the tax form you file. This file is the spec for the feature. Decisions are final unless marked as a judgment call.

## Scope

- One release, on every plan.
- A workspace is one company, or one person's business when they have no company. Products are labels (QuickBooks classes, Xero tracking categories) on each line.
- Countries with tax forms: Canada (with Quebec's provincial forms) and the US. Elsewhere, the report is a plain profit and loss.
- Not in this release: connecting a bank account, storing receipts, sales tax returns, direct QuickBooks or Xero sync, home office, payroll.

## Settings

| Setting | Where | Stored |
|---|---|---|
| Incorporated company, and since when | Checkbox at workspace creation; date in Books settings | `workspaces.incorporated_on` (null: not incorporated). Lines dated before it follow the not-incorporated rules. |
| Country and province or state | Books settings | `workspaces.country` (ISO 3166-1 alpha-2), `workspaces.region` (`QC`, `CA`, ...) |
| Paid with, and since when | Connection page and cost form, shown for incorporated workspaces only | `connections.paid_with` and `flat_costs.paid_with` (`personal` or `company`, default `personal`), `*.paid_with_since` (null: always). Before the date, the other value applies. |
| Account names | Export dialog, QuickBooks and Xero formats only | `workspaces.book_accounts` (jsonb: account key to name) |
| Manual cost category | Cost form | `flat_costs.category` (see accounts) and `interval` gains `once` |

A setting with a start date supports one change. Two changes in a year would need a history table; nobody has asked.

## Data the connectors add

- `revenue_lines.gross_base_cents`, `fees_base_cents`, `refunds_base_cents`: written by the sync at the line's rate, like `net_base_cents`. Older rows are null until the next full sync; readers derive them from the net rate when net is not zero.
- `revenue_lines.service_start`, `service_end`: the period a payment covers, `[start, end)`. Null means the payment is earned on its date.
- `payouts`: money a payment provider sent to a bank account. Stripe and Polar.
- Bank of Canada daily rates for workspaces in CAD (Income Tax Folio S5-F4-C1, ¶1.4). Other currencies keep ECB rates.

## Accounts

Every amount lands in one account. Keys are stable; names are defaults the user can rename for QuickBooks or Xero.

| Key | Default name | Type |
|---|---|---|
| `company_bank` | Company bank | Asset |
| `balance:<provider>` | `<Provider>` balance | Asset (negative when a bill is owed) |
| `equipment` | Equipment | Asset |
| `accumulated_depreciation` | Accumulated depreciation | Asset (contra) |
| `sales_tax_owed` | Sales tax owed | Liability |
| `deferred_revenue` | Deferred revenue | Liability |
| `owed_to_founder` | Owed to founder | Liability (incorporated only) |
| `owner_contributions` | Owner contributions | Equity (not incorporated) |
| `owner_draws` | Owner draws | Equity (not incorporated) |
| `sales` | Sales | Income |
| `refunds` | Refunds | Income (contra) |
| `payment_fees` | Payment fees | Expense |
| `ai_apis` | AI and APIs | Expense |
| `hosting` | Hosting | Expense |
| `email` | Email | Expense |
| `software` | Software | Expense |
| `contractors` | Contractors | Expense |
| `other` | Other expenses | Expense |
| `depreciation` | Depreciation | Expense |

Default expense account per provider: AI and APIs for OpenAI, Anthropic, OpenRouter, xAI, Firecrawl and Twilio; Hosting for Vercel, Railway, Cloudflare, DigitalOcean, Neon, MongoDB Atlas and Supabase; Email for Resend; Software for GitHub. A manual cost uses its category; `equipment` makes it an asset.

## Journal rules

All amounts are in the workspace currency. Every entry balances. "Payer" is `owed_to_founder` when incorporated and paid with a personal card, `company_bank` when paid by the company, and `owner_contributions` when not incorporated.

| Event | Debit | Credit |
|---|---|---|
| Payment received (on its date) | `balance:<provider>` gross − refunds − fees + tax; `payment_fees` fees; `refunds` refunds | `deferred_revenue` gross; `sales_tax_owed` tax (only when the provider does not remit tax) |
| Revenue earned (each month of the service period, by days) | `deferred_revenue` | `sales` |
| Payout to a bank account | `company_bank` (incorporated) or `owner_draws` | `balance:<provider>` |
| Usage cost (on its date) | expense account | `balance:<provider>` |
| Usage paid (same date, Q17: no top-up data) | `balance:<provider>` | payer |
| Monthly or yearly manual cost (each month, yearly ÷ 12) | category account | payer |
| One-time manual cost | category account, or `equipment` | payer |
| Year-end depreciation (December) | `depreciation` | `accumulated_depreciation` |

Merchant of record sales (Polar, Paddle, Lemon Squeezy) carry no tax in the books: gross is the customer's price before tax, the merchant's fee is a payment fee, and the provider balance excludes the tax.

**Formats and the bank feed.** QuickBooks and Xero users usually have a bank feed for the company account. Those two formats leave out the entries that move money in or out of `company_bank` (payouts and company-paid costs) so the bank feed books them against the same provider balance. The plain journal and the tax report include them.

**Months.** A journal covers one calendar month. Exporting a month closes it: OpenProfit stores the exported totals in `journal_exports`. When provider data for a closed month changes later, the next export adds an adjustment entry for the difference, dated the first day of the month being exported.

**Fiscal year.** Calendar year. Corporations with another year end aren't supported yet.

## Export dialog

Opens from the Books page. Format (CSV, QuickBooks journal, Xero journal, plain journal), month, and product. The product defaults to the switcher's product for CSV and to All for journals; a journal for one product shows: "Leaves out shared and unassigned costs. Import it into your books only if this product is its own company."

- CSV: the existing lines export.
- QuickBooks: Journal No., Journal Date, Account Name, Description, Debits, Credits, Class. Account names must match the company's chart of accounts.
- Xero: manual journal import template (Narration, Date, Description, AccountCode, TaxRate, Amount, Tracking). Verify the headers against Xero's template before shipping.
- Plain: Date, Account, Product, Description, Debit, Credit.

## Tax report

Yearly, by calendar year, from the journal totals. It ends with: "OpenProfit prepares these numbers from your providers. Check them before you file; this isn't tax advice." It reminds the user to keep invoices (6 years in Canada, at least 3 in the US) and links each provider's invoice page.

### Canada, not incorporated: T2125 (federal), TP-80 (Quebec)

| Account | T2125 (2025) | TP-80 |
|---|---|---|
| `sales` − `refunds` | 8000 Adjusted gross sales | 110 Sales |
| `payment_fees` | 8710 Interest and bank charges* | 246 Other* |
| `ai_apis`, `hosting`, `email`, `software` | 9270 Other expenses, itemized* | 246 Other, itemized* |
| `contractors` | 8860 Professional fees | 246 Other* |
| `other` | 9270 Other expenses | 246 Other |
| Equipment (computers) | 9936 Capital cost allowance, class 50, 55% with the half-year rule | 240 Capital cost allowance |
| `owner_draws`, `owner_contributions` | 9932 Drawings, 9933 Capital contributions | |

Sales exclude GST/HST and QST collected. The proposed 100% first-year rate for class 50 is not law in the 2025 guide; the report uses 55% and mentions the proposal.

### Canada, incorporated: GIFI (T2 schedules 125 and 100; CO-17 in Quebec)

| Account | GIFI |
|---|---|
| `sales` − `refunds` | 8000 Trade sales of goods and services |
| `payment_fees` | 8716 Credit card charges |
| `ai_apis`, `hosting`, `software` | 9150 Computer-related expenses* |
| `email` | 9150 Computer-related expenses* |
| `contractors` | 9110 Sub-contracts |
| `depreciation` | 8670 Amortization of tangible assets |
| `other` | 9270 Other expenses |
| `company_bank` | 1001 Cash |
| `equipment`, `accumulated_depreciation` | 1774, 1775 Computer equipment and its amortization |
| `sales_tax_owed` | 2680 Taxes payable |
| `owed_to_founder` | 2781 Due to individual shareholder(s) |
| `deferred_revenue` | 2620 Amounts payable and accrued liabilities* |

### US, not incorporated (and single-member LLCs): Schedule C

| Account | Schedule C (2025) |
|---|---|
| `sales` | Line 1 Gross receipts |
| `refunds` | Line 2 Returns and allowances |
| `contractors` | Line 11 Contract labor |
| `payment_fees`, `ai_apis`, `hosting`, `email`, `software`, `other` | Line 27b Other expenses, itemized in Part V* |
| Equipment | Up to $2,500 per item: Part V under the de minimis safe harbor, with the election statement written for the user. Above: line 13 through Form 4562. |

The books use the accrual method, which the IRS allows for a sole proprietor as long as income and expenses use the same method.

### US, incorporated: Forms 1120, 1120-S, 1065

Income on line 1a (gross receipts), 1b (returns); deductions on the other-deductions line (1120 line 26, 1120-S line 20, 1065 line 21) except depreciation (1120 line 20, 1120-S line 14). Schedule L (balance sheet) only when receipts or assets reach $250,000; `owed_to_founder` is line 19, loans from shareholders.

\* Judgment call: no CRA or IRS guidance names this line.

## Judgment calls

- Lines for AI, hosting, software and payment fees, marked above.
- Merchant of record sales at the customer's price with the merchant's fee as an expense. Profit is the same either way.
- Usage booked as paid on the day it's used, because only xAI reports credit top-ups.
- Monthly and yearly manual costs booked as paid each month.

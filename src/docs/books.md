---
navLabel: Books
contentType: How-to
description: Export a month of revenue and costs as a journal for QuickBooks, Xero or any accounting software, and get the year's numbers on the lines of your tax form.
---

# Keep your books and prepare your tax numbers

The **Books** page turns the revenue and costs OpenProfit already syncs into a monthly journal you can import into QuickBooks, Xero or any accounting software, and a yearly report on the lines of your tax form. This page shows you how to set up your business, export a month, and read the tax report.

OpenProfit prepares these numbers from your providers. Check them before you file; they aren't tax advice.

## Set up your business

The journal and the tax report depend on three settings in **Books → Business**:

- **Incorporated company**: turn it on if your company files its own tax return, and set the date it was incorporated. You can also check **This is an incorporated company** when you create a workspace. Lines before the date follow the rules for a business without a company.
- **Country** and **Province** or **State**: the tax report uses your country's forms. Canada and the United States are supported; other countries get a plain profit and loss.
- **Paid with**: for a company, say whether you pay each provider with your personal card or a company account. A cost on your personal card is money the company owes you. Add a **Since** date when you switch cards.

Costs without an API go on the **Costs** page. Choose **One time** for a single purchase, and pick a category. A computer or other equipment goes under **Equipment**, which the tax report depreciates instead of deducting at once.

## Export a month

1. Open **Books** and click **Export**.
2. Pick a format: **QuickBooks journal**, **Xero journal**, **Plain journal** for other accounting software, or **CSV** for every line in a spreadsheet.
3. Pick the month. Only months that have ended are listed.
4. Leave **Product** on **All** for your books. A journal for one product leaves out shared costs, so import it only if that product is its own company.
5. Click **Download**.

Exporting a whole month closes it. The same month always exports the same file, and if a provider changes its numbers later, your next export adds an adjustment for the difference.

### Import into QuickBooks Online

In QuickBooks, open **Settings → Import data → Journal entries** and upload the file. Account names in the file must match your chart of accounts: rename them under **Account names** in the export dialog first. Products appear as classes when class tracking is on.

The QuickBooks and Xero files leave out payouts and costs paid from your company bank account, because your bank feed already records that money. They still include everything paid with a personal card, which no bank feed sees.

### Import into Xero

In Xero, open **Accounting → Manual journals → Import** and upload the file. Xero matches accounts by code, so enter your account codes under **Account names** in the export dialog. Products appear as a tracking category. Add a tax rate before you post the journals.

## How OpenProfit records your money

Every amount lands in an account, and every entry balances:

| What happened | Recorded as |
|---|---|
| A customer paid | Sales, with payment fees and refunds as their own lines, and sales tax you collected as tax owed |
| A subscription covers a later month | Spread over the months it pays for |
| You used a provider | An expense: AI and APIs, Hosting, Email or Software, by provider |
| You paid with your personal card | Owner contributions, or owed to you if you have a company |
| A provider paid out to your bank | Moved from that provider's balance to your bank, or owner draws without a company |
| You bought equipment | An asset, depreciated in December |

Sales through Polar, Paddle or Lemon Squeezy carry no sales tax in your books, because they file it for you.

## Read the tax report

Pick the year at the top of **Tax report**. The report lists each line of your form with its number and amount:

| Your business | Forms |
|---|---|
| Canada, no company | T2125, plus TP-80 in Quebec |
| Canada, company | GIFI schedules 125 and 100 for the T2, and the CO-17 in Quebec |
| United States, no company or a single-member LLC | Schedule C |
| United States, company | Form 1120, with the 1120-S and 1065 equivalents |

A line marked **Our choice** has no official home for that cost, such as AI usage or payment fees, and the note says why OpenProfit picked it. If you incorporated during the year, the report splits at that date.

Equipment follows your country's rules. In Canada, a computer is class 50. In the United States, an item up to $2,500 is deducted in full under the de minimis safe harbor, and the report writes the election statement you attach to your return.

Keep your invoices: 6 years in Canada and at least 3 in the United States. The report links to each connected provider's billing page.

## Limits

- **Polar payouts**: Polar's API doesn't share them, so money Polar sends to your bank isn't recorded.
- **Fiscal year**: the books follow the calendar year.
- **Not included**: sales tax returns, receipts, payroll and home office expenses.

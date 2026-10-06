import { register } from "./registry";
import {
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.twilio.com";
const headers = (c: Credentials) => ({
	Authorization: `Basic ${btoa(`${c.keySid}:${c.keySecret}`)}`,
});

type UsageRecord = {
	start_date: string;
	price: string | number;
	price_unit: string;
};
type Page = { usage_records: UsageRecord[]; next_page_uri: string | null };

// One line per day from the "totalprice" category. Other categories overlap
// (calls contains calls-inbound) and miss uncategorized costs, so summing
// them is wrong.
export function dailyLines(records: UsageRecord[]): CostLine[] {
	return records.flatMap((r) => {
		const cents = toCents(Number(r.price));
		if (!cents) return [];
		return {
			externalId: `${r.start_date}:totalprice`,
			date: r.start_date,
			currency: r.price_unit.toUpperCase(),
			amountCents: cents,
			service: "Usage",
		};
	});
}

// https://www.twilio.com/docs/usage/api/usage-record#read-multiple-usagerecord-resources
const dailyUrl = (c: Credentials, from: string, to: string, size: number) =>
	`${BASE}/2010-04-01/Accounts/${c.accountSid.trim()}/Usage/Records/Daily.json?Category=totalprice&StartDate=${from}&EndDate=${to}&PageSize=${size}`;

export const twilio = register({
	id: "twilio",
	name: "Twilio",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{ name: "accountSid", label: "Account SID", placeholder: "AC…" },
			{ name: "keySid", label: "API key SID", placeholder: "SK…" },
			{ name: "keySecret", label: "API key secret", secret: true },
		],
		createUrl:
			"https://1console.twilio.com/go?to=/account/__account__/settings/us1/api-keys/list",
		scopes: ["Restricted key with /twilio/billing/usage/read"],
	},
	async verify(c) {
		const today = new Date().toISOString().slice(0, 10);
		await getJson<Page>(dailyUrl(c, today, today, 1), { headers: headers(c) });
		// A usage-only key can't read the account's name.
		const sid = c.accountSid.trim();
		return { label: `${sid.slice(0, 2)}…${sid.slice(-4)}` };
	},
	async fetchCosts(c, range: SyncRange) {
		const records: UsageRecord[] = [];
		let url: string | null = dailyUrl(c, range.from, range.to, 1000);
		while (url) {
			const page: Page = await getJson<Page>(url, { headers: headers(c) });
			records.push(...page.usage_records);
			// next_page_uri is relative to api.twilio.com.
			url = page.next_page_uri ? `${BASE}${page.next_page_uri}` : null;
		}
		return dailyLines(records);
	},
});

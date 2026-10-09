import { z } from "zod";
import { ACCOUNTS, type CostCategory, EXPENSE_CATEGORIES } from "./books";
import { Day } from "./costs";

// Books settings (docs/BOOKS.md), shared by the Books page, the cost form and
// the MCP server.

// Countries with a tax form in the report. Elsewhere (null), the report is a
// plain profit and loss.
export const COUNTRIES = { CA: "Canada", US: "United States" } as const;
export type Country = keyof typeof COUNTRIES;

// ISO 3166-2 subdivision codes without the country prefix.
export const REGIONS: Record<Country, Record<string, string>> = {
	CA: {
		AB: "Alberta",
		BC: "British Columbia",
		MB: "Manitoba",
		NB: "New Brunswick",
		NL: "Newfoundland and Labrador",
		NS: "Nova Scotia",
		NT: "Northwest Territories",
		NU: "Nunavut",
		ON: "Ontario",
		PE: "Prince Edward Island",
		QC: "Quebec",
		SK: "Saskatchewan",
		YT: "Yukon",
	},
	US: {
		AL: "Alabama",
		AK: "Alaska",
		AZ: "Arizona",
		AR: "Arkansas",
		CA: "California",
		CO: "Colorado",
		CT: "Connecticut",
		DE: "Delaware",
		DC: "District of Columbia",
		FL: "Florida",
		GA: "Georgia",
		HI: "Hawaii",
		ID: "Idaho",
		IL: "Illinois",
		IN: "Indiana",
		IA: "Iowa",
		KS: "Kansas",
		KY: "Kentucky",
		LA: "Louisiana",
		ME: "Maine",
		MD: "Maryland",
		MA: "Massachusetts",
		MI: "Michigan",
		MN: "Minnesota",
		MS: "Mississippi",
		MO: "Missouri",
		MT: "Montana",
		NE: "Nebraska",
		NV: "Nevada",
		NH: "New Hampshire",
		NJ: "New Jersey",
		NM: "New Mexico",
		NY: "New York",
		NC: "North Carolina",
		ND: "North Dakota",
		OH: "Ohio",
		OK: "Oklahoma",
		OR: "Oregon",
		PA: "Pennsylvania",
		RI: "Rhode Island",
		SC: "South Carolina",
		SD: "South Dakota",
		TN: "Tennessee",
		TX: "Texas",
		UT: "Utah",
		VT: "Vermont",
		VA: "Virginia",
		WA: "Washington",
		WV: "West Virginia",
		WI: "Wisconsin",
		WY: "Wyoming",
	},
};

// A change to the workspace's books settings. Fields left out keep their
// value. `country` sets `region` too, so a new country clears the old one's
// province or state.
export const BooksSettingsInput = z
	.object({
		incorporatedOn: Day.nullable().optional(),
		country: z.enum(["CA", "US"]).nullable().optional(),
		region: z.string().nullable().optional(),
	})
	.refine(
		(s) =>
			s.region == null ||
			(s.country != null && Object.hasOwn(REGIONS[s.country], s.region)),
		{ message: "Send region with its country, as a code from that country." },
	);

// The workspace columns to update; Drizzle leaves out undefined fields.
export const booksSettingsPatch = (s: z.infer<typeof BooksSettingsInput>) => ({
	incorporatedOn: s.incorporatedOn,
	...(s.country !== undefined && {
		country: s.country,
		region: s.region ?? null,
	}),
});

// Today in the browser's time zone, YYYY-MM-DD.
export const localDay = (d = new Date()) =>
	new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 10);

export const PAID_WITH = {
	personal: "Personal card",
	company: "Company account",
} as const;
export type PaidWith = keyof typeof PAID_WITH;

// The manual cost categories, in form order.
export const COST_CATEGORIES = [...EXPENSE_CATEGORIES, "equipment"] as const;
export const categoryName = (c: CostCategory) => ACCOUNTS[c].name;

import "@tanstack/react-start/server-only";
import cookies from "../legal/cookies.md?raw";
import privacy from "../legal/privacy.md?raw";
import terms from "../legal/terms.md?raw";
import { toHtml } from "./content";

export const LEGAL_MD = { privacy, terms, cookies };

export const LEGAL = {
	privacy: {
		title: "Privacy Policy",
		html: toHtml(privacy),
	},
	terms: {
		title: "Terms of Service",
		html: toHtml(terms),
	},
	cookies: {
		title: "Cookie Policy",
		html: toHtml(cookies),
	},
};

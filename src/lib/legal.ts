import { marked } from "marked";
import cookies from "../legal/cookies.md?raw";
import privacy from "../legal/privacy.md?raw";
import terms from "../legal/terms.md?raw";

export const LEGAL_MD = { privacy, terms, cookies };

export const LEGAL = {
	privacy: {
		title: "Privacy Policy",
		html: marked.parse(privacy, { async: false }) as string,
	},
	terms: {
		title: "Terms of Service",
		html: marked.parse(terms, { async: false }) as string,
	},
	cookies: {
		title: "Cookie Policy",
		html: marked.parse(cookies, { async: false }) as string,
	},
};

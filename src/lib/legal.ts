import { marked } from "marked";
import privacy from "../legal/privacy.md?raw";
import terms from "../legal/terms.md?raw";

export const LEGAL = {
	privacy: {
		title: "Privacy Policy",
		html: marked.parse(privacy, { async: false }) as string,
	},
	terms: {
		title: "Terms of Service",
		html: marked.parse(terms, { async: false }) as string,
	},
};

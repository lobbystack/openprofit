// Theme lives in localStorage; the root route applies it before paint.
export const THEME_SCRIPT = `try{var t=localStorage.theme;if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

function flip() {
	const dark = document.documentElement.classList.toggle("dark");
	try {
		localStorage.theme = dark ? "dark" : "light";
	} catch {}
}

// Cross-fades between themes where the browser supports view transitions,
// unless the user asked for reduced motion.
export function toggleTheme() {
	const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (!calm && "startViewTransition" in document) {
		document.startViewTransition(flip);
	} else {
		flip();
	}
}

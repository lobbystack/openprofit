// Theme lives in localStorage; the root route applies it before paint.
export const THEME_SCRIPT = `try{var t=localStorage.theme;if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export function toggleTheme() {
	const dark = document.documentElement.classList.toggle("dark");
	try {
		localStorage.theme = dark ? "dark" : "light";
	} catch {}
}

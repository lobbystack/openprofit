import { useEffect, useState } from "react";
import { siGithub } from "simple-icons";
import { APP_NAME } from "#/lib/app";
import { Button, Container } from "./primitives";

const LINKS = [
	["Product", "#product"],
	["Connectors", "#connectors"],
	["Pricing", "#pricing"],
	["Docs", "/docs"],
];

// Fixed, 56px, white, links 14px, Log in bordered + Sign up black, both 32px.
export function Nav() {
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={`fixed inset-x-0 top-0 z-40 bg-paper/90 backdrop-blur transition-[border-color] duration-150 ${
				scrolled ? "border-b border-line" : "border-b border-transparent"
			}`}
		>
			<Container className="flex h-14 items-center justify-between">
				<a href="/" className="text-[15px]">
					{APP_NAME}
				</a>
				<nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-[14px] text-text-2 md:flex">
					{LINKS.map(([label, href]) => (
						<a key={label} href={href} className="hover:text-ink">
							{label}
						</a>
					))}
					<a
						href="https://github.com"
						className="flex items-center gap-1.5 hover:text-ink"
					>
						<svg
							viewBox="0 0 24 24"
							width="14"
							height="14"
							fill="currentColor"
							role="img"
							aria-label="GitHub"
						>
							<path d={siGithub.path} />
						</svg>
						GitHub
					</a>
				</nav>
				<div className="flex items-center gap-2">
					<Button variant="secondary" size="sm" href="/app">
						Log in
					</Button>
					<Button size="sm" href="/app">
						Sign up
					</Button>
				</div>
			</Container>
		</header>
	);
}

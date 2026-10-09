import { useEffect, useState } from "react";
import { siGithub } from "simple-icons";
import { Logo } from "#/components/logo";
import { buttonVariants } from "#/components/ui/button";
import { GITHUB_URL } from "#/lib/app";
import { Container, Href } from "./primitives";

const LINKS = [
	["Product", "/#product"],
	["Integrations", "/integrations"],
	["Pricing", "/#pricing"],
	["Docs", "/docs"],
	["Blog", "/blog"],
];

// Fixed, 56px, white, links 14px, Sign in bordered + Start free black, both 32px.
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
			className={`chrome fixed inset-x-0 top-0 z-40 transition-[border-color] duration-150 ${
				scrolled ? "border-b border-line" : "border-b border-transparent"
			}`}
		>
			<Container className="flex h-14 items-center justify-between">
				<Href href="/">
					<Logo />
				</Href>
				<nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 text-[14px] text-text-2 md:flex">
					{LINKS.map(([label, href]) => (
						<Href key={label} href={href} className="hover:text-ink">
							{label}
						</Href>
					))}
					<a
						href={GITHUB_URL}
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
					<Href
						href="/login"
						className={buttonVariants({
							variant: "outline",
							size: "sm",
							weight: "medium",
						})}
					>
						Sign in
					</Href>
					<Href
						href="/login"
						className={buttonVariants({ size: "sm", weight: "medium" })}
					>
						Start free
					</Href>
				</div>
			</Container>
		</header>
	);
}

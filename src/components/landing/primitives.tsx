import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "#/components/ui/button";

// Landing primitives. Measurements at 1280px.

// Paths inside the site navigate in the app and preload on hover; anything
// else is a plain link.
export function Href({
	href,
	...props
}: { href: string } & Omit<React.ComponentProps<"a">, "href">) {
	if (!href.startsWith("/")) return <a href={href} {...props} />;
	const [to, hash] = href.split("#");
	return <Link to={to} hash={hash} {...props} />;
}

export function Container({
	children,
	className = "",
	width = 1080,
}: {
	children: React.ReactNode;
	className?: string;
	width?: 1080 | 1024;
}) {
	return (
		<div
			className={`mx-auto w-full px-4 ${className}`}
			style={{ maxWidth: width + 32 }}
		>
			{children}
		</div>
	);
}

// 16px colored square with an icon, 8px gap, 16px label.
export function Eyebrow({
	children,
	tone = "ink",
}: {
	children: React.ReactNode;
	tone?: "ink" | "positive" | "negative" | "pending" | "brand";
}) {
	const bg = {
		ink: "bg-ink",
		positive: "bg-positive",
		negative: "bg-negative",
		pending: "bg-pending",
		brand: "bg-brand",
	}[tone];
	return (
		<div className="flex items-center gap-2 text-[16px]">
			<span className={`h-4 w-4 rounded-[4px] ${bg}`} />
			<span>{children}</span>
		</div>
	);
}

// Eyebrow, H2 48/48 max 512, paragraph 18/28 max 576, bordered button.
export function SectionHeader({
	eyebrow,
	tone,
	title,
	children,
	cta,
	href,
	align = "left",
	size = 48,
}: {
	eyebrow?: string;
	tone?: "ink" | "positive" | "negative" | "pending" | "brand";
	title: string;
	children?: React.ReactNode;
	cta?: string;
	href?: string;
	align?: "left" | "center";
	size?: 48 | 40 | 36;
}) {
	const center = align === "center";
	return (
		<div className={center ? "flex flex-col items-center text-center" : ""}>
			{eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
			<h2
				className={`${eyebrow ? "mt-4" : ""} display max-w-[512px]`}
				style={{ fontSize: size }}
			>
				{title}
			</h2>
			{children && (
				<p className="prose-landing mt-5 max-w-[576px]">{children}</p>
			)}
			{cta && href && (
				<div className="mt-6">
					<Href
						href={href}
						className={buttonVariants({
							variant: "outline",
							size: "lg",
							weight: "medium",
						})}
					>
						{cta}
					</Href>
				</div>
			)}
		</div>
	);
}

// 3 columns of 240px, gap 32/40, icon + 14px title + 14px text + link.
export function Triplet({
	items,
}: {
	items: {
		icon: React.ReactNode;
		title: string;
		text: string;
		href?: string;
	}[];
}) {
	return (
		<div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-x-10">
			{items.map((it) => (
				<div key={it.title} className="relative pl-6 pr-2">
					<span className="absolute top-0.5 left-0 text-text-2">{it.icon}</span>
					<div className="text-[14px] font-medium">{it.title}</div>
					<p className="mt-1 text-[14px] text-text-2">{it.text}</p>
					{it.href && (
						<Href
							href={it.href}
							className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-text-2 hover:text-ink"
						>
							Learn more
							<ArrowRight size={14} />
						</Href>
					)}
				</div>
			))}
		</div>
	);
}

export function Section({
	children,
	className = "",
	muted = false,
	border = true,
}: {
	children: React.ReactNode;
	className?: string;
	muted?: boolean;
	border?: boolean;
}) {
	return (
		<section
			className={`${muted ? "bg-surface-1" : ""} ${border ? "border-b border-line" : ""} ${className}`}
		>
			{children}
		</section>
	);
}

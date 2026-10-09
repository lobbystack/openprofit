import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { seo } from "#/lib/app";
import { dayLabel } from "#/lib/format";
import { getPosts } from "#/server/content.functions";

export const Route = createFileRoute("/blog/")({
	head: () =>
		seo({
			title: "Blog · OpenProfit",
			description:
				"Guides on revenue, costs, books and taxes for developers who run their own software products.",
			path: "/blog",
		}),
	loader: () => getPosts(),
	component: Blog,
});

function Blog() {
	const posts = Route.useLoaderData();
	return (
		<>
			<Nav />
			<main className="mx-auto w-full max-w-[720px] px-4 pt-28 pb-24">
				<h1 className="display text-[36px]">Blog</h1>
				<ul className="mt-10 divide-y divide-line border-y border-line">
					{posts.map((p) => (
						<li key={p.slug}>
							<Link
								to="/blog/$slug"
								params={{ slug: p.slug }}
								className="block py-6"
							>
								<time dateTime={p.date} className="text-[13px] text-text-2">
									{dayLabel(p.date)}
								</time>
								<h2 className="mt-1 text-[20px]">{p.title}</h2>
								<p className="mt-2 text-[15px] text-text-2">{p.description}</p>
							</Link>
						</li>
					))}
				</ul>
			</main>
			<Footer />
		</>
	);
}

import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { getDocsNav } from "#/server/content.functions";

export const Route = createFileRoute("/docs")({
	loader: () => getDocsNav(),
	component: Docs,
});

function Docs() {
	const docs = Route.useLoaderData();
	return (
		<>
			<Nav />
			<div className="mx-auto flex w-full max-w-[1112px] gap-12 px-4 pt-28 pb-24">
				<aside className="hidden w-48 shrink-0 md:block">
					<div className="label-mono">Docs</div>
					<ul className="mt-3 space-y-1">
						{docs.map((d) => (
							<li key={d.slug}>
								<Link
									to="/docs/$slug"
									params={{ slug: d.slug }}
									className="block rounded-md px-2 py-1 text-[13px] text-text-2 hover:text-ink"
									activeProps={{ className: "bg-surface-1 text-ink" }}
								>
									{d.navLabel}
								</Link>
							</li>
						))}
					</ul>
				</aside>
				<main className="prose-docs min-w-0 flex-1">
					<Outlet />
				</main>
			</div>
			<Footer />
		</>
	);
}

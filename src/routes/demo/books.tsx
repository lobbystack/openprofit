import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import { TaxReport } from "#/components/books/tax-report";
import { getTaxReport } from "#/server/tax.functions";

// The demo's tax report. The export and the settings change data, so the
// demo leaves them out.
export const Route = createFileRoute("/demo/books")({
	head: () => ({ meta: [{ title: "Books · OpenProfit demo" }] }),
	validateSearch: (s: Record<string, unknown>): { year?: number } => ({
		year:
			typeof s.year === "number" && Number.isInteger(s.year)
				? s.year
				: undefined,
	}),
	// Same default as /app/books: last year until April, this year after.
	loaderDeps: ({ search }) => ({
		year:
			search.year ??
			new Date().getUTCFullYear() - (new Date().getUTCMonth() < 4 ? 1 : 0),
	}),
	loader: ({ deps }) => getTaxReport({ data: { year: deps.year, demo: true } }),
	component: DemoBooks,
});

function DemoBooks() {
	const report = Route.useLoaderData();
	const navigate = useNavigate({ from: Route.fullPath });
	return (
		<>
			<PageHeader title="Books" />
			<div className="mt-4">
				<TaxReport
					report={report}
					onYear={(year) => navigate({ search: (s) => ({ ...s, year }) })}
				/>
			</div>
		</>
	);
}

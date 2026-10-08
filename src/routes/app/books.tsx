import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import { BooksExport } from "#/components/books/export";
import { BooksSettings } from "#/components/books/settings";
import { TaxReport } from "#/components/books/tax-report";
import { getBooksSettings } from "#/server/books-settings.functions";
import { getTaxReport } from "#/server/tax.functions";

// The books (docs/BOOKS.md): the monthly journal export, the yearly tax
// report, and the settings they depend on.
export const Route = createFileRoute("/app/books")({
	head: () => ({ meta: [{ title: "Books · OpenProfit" }] }),
	validateSearch: (s: Record<string, unknown>): { year?: number } => ({
		year:
			typeof s.year === "number" && Number.isInteger(s.year)
				? s.year
				: undefined,
	}),
	loaderDeps: ({ search }) => ({
		// Last year until April, when most people file; this year after.
		year:
			search.year ??
			new Date().getUTCFullYear() - (new Date().getUTCMonth() < 4 ? 1 : 0),
	}),
	loader: async ({ deps }) => {
		const [settings, report] = await Promise.all([
			getBooksSettings(),
			getTaxReport({ data: { year: deps.year } }),
		]);
		return { settings, report };
	},
	component: Books,
});

function Books() {
	const { settings, report } = Route.useLoaderData();
	return (
		<>
			<PageHeader title="Books" />
			<div className="mt-4 grid gap-4">
				<BooksExport />
				<TaxReport report={report} />
				<BooksSettings settings={settings} />
			</div>
		</>
	);
}

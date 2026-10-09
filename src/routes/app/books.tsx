import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import { BooksExport } from "#/components/books/export";
import { BooksSettings } from "#/components/books/settings";
import { TaxReport } from "#/components/books/tax-report";
import { getJournalExport } from "#/server/books-export.functions";
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
		const [settings, report, exportOptions] = await Promise.all([
			getBooksSettings(),
			getTaxReport({ data: { year: deps.year } }),
			getJournalExport(),
		]);
		return { settings, report, exportOptions };
	},
	component: Books,
});

function Books() {
	const { settings, report, exportOptions } = Route.useLoaderData();
	const navigate = useNavigate({ from: Route.fullPath });
	return (
		<>
			<PageHeader title="Books" />
			<div className="mt-4 grid gap-4">
				<BooksExport options={exportOptions} />
				<TaxReport
					report={report}
					onYear={(year) => navigate({ search: (s) => ({ ...s, year }) })}
				/>
				<BooksSettings settings={settings} />
			</div>
		</>
	);
}

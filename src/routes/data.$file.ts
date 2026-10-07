import { createFileRoute } from "@tanstack/react-router";

const FILES = {
	"benchmarks.csv": "text/csv; charset=utf-8",
	"benchmarks.json": "application/json; charset=utf-8",
} as const;

// The benchmark dataset at stable URLs: every published month, revenue in
// US dollars, the other metrics in percent of revenue. Hosted only.
export const Route = createFileRoute("/data/$file")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { isCloud } = await import("#/server/billing.server");
				if (!isCloud || !Object.hasOwn(FILES, params.file))
					return new Response("Not found", { status: 404 });
				const { allSnapshots } = await import("#/server/benchmarks.server");
				const rows = (await allSnapshots()).map((r) => {
					const usd = r.metric === "revenue";
					return {
						month: r.month,
						band: r.band,
						metric: r.metric,
						unit: usd ? "usd" : "percent",
						n: r.n,
						...Object.fromEntries(
							(["p25", "p50", "p75", "p90"] as const).map((k) => [
								k,
								usd ? r[k] / 100 : r[k],
							]),
						),
					};
				});
				const csv = params.file === "benchmarks.csv";
				const body = csv
					? [
							"month,band,metric,unit,n,p25,p50,p75,p90",
							...rows.map((r) => Object.values(r).join(",")),
						].join("\n")
					: JSON.stringify({
							title: "OpenProfit benchmarks",
							source: "https://openprofit.dev/data",
							license: "CC BY 4.0",
							license_url: "https://creativecommons.org/licenses/by/4.0/",
							attribution:
								"OpenProfit benchmarks, openprofit.dev/data, CC BY 4.0",
							rows,
						});
				return new Response(`${body}\n`, {
					headers: {
						"Content-Type": FILES[params.file as keyof typeof FILES],
						// New figures land once a month.
						"Cache-Control": "public, max-age=3600",
						"Access-Control-Allow-Origin": "*",
					},
				});
			},
		},
	},
});

import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { DATA } from "#/lib/content";
import { allSnapshots, myBenchmarks } from "./benchmarks.server";
import { isCloud } from "./billing.server";
import { currentWorkspace } from "./workspace.server";

// The public /data page. Hosted only.
export const getBenchmarks = createServerFn({ method: "GET" }).handler(
	async () => {
		if (!isCloud) throw notFound();
		return {
			title: DATA.title,
			description: DATA.description,
			html: DATA.html,
			rows: await allSnapshots(),
		};
	},
);

// The overview's comparison with the workspace's band. Null hides it.
export const getMyBenchmarks = createServerFn({ method: "GET" }).handler(
	async () => {
		if (!isCloud) return null;
		const ws = await currentWorkspace();
		return myBenchmarks(ws).catch((err) => {
			console.error("[benchmarks]", err);
			return null;
		});
	},
);

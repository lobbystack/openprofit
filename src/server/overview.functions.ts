import { createServerFn } from "@tanstack/react-start";
import { overview } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

export const getOverview = createServerFn({ method: "GET" }).handler(
	async () => {
		const ws = await currentWorkspace();
		return overview(ws);
	},
);

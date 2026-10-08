import { createServerFn } from "@tanstack/react-start";
import { currentWorkspace } from "./workspace.server";

// Books settings (docs/BOOKS.md). Stub: the settings work fills this in.
export const getBooksSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const ws = await currentWorkspace();
		return {
			incorporatedOn: ws.incorporatedOn,
			country: ws.country,
			region: ws.region,
		};
	},
);

import "@tanstack/react-start/server-only";
import { redirect } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db, schema } from "#/db";
import { SITE_URL } from "#/lib/app";
import { isCloud } from "./billing.server";
import { seedWorkspace } from "./seed.server";
import type { Workspace } from "./workspace.server";

// The public read-only demo at /demo: one workspace with `demo = true` and
// no members, filled by the seed generator. On by default on the hosted
// version; self-hosted instances turn it on with DEMO=on.
export const demoEnabled = isCloud || process.env.DEMO === "on";

// Rebuilt when older than this, so the twelve months end this month and
// connections show a recent sync.
const MAX_AGE_MS = 60 * 60_000;

let rebuilding: Promise<Workspace> | null = null;

// Only read paths call this. currentWorkspace() never returns the demo, so
// no mutation can reach it.
export async function demoWorkspace(): Promise<Workspace> {
	if (!demoEnabled) throw redirect({ href: `${SITE_URL}/demo` });
	const ws = await findDemo();
	if (ws && Date.now() - ws.createdAt < MAX_AGE_MS) return ws;
	rebuilding ??= rebuild().finally(() => {
		rebuilding = null;
	});
	return rebuilding;
}

const findDemo = () =>
	db.query.workspaces.findFirst({ where: eq(schema.workspaces.demo, true) });

// Delete and reseed in one transaction, so readers see the old demo or the
// new one. Another process rebuilding at the same moment fails on the slug
// and reads the winner's.
async function rebuild(): Promise<Workspace> {
	try {
		return await db.transaction(async (tx) => {
			await tx
				.delete(schema.workspaces)
				.where(eq(schema.workspaces.demo, true));
			// User slugs never contain "_", so this one is always free.
			const { ws } = await seedWorkspace(tx, {
				name: "Acme Labs",
				slug: "_demo",
				demo: true,
			});
			return ws;
		});
	} catch (err) {
		const ws = await findDemo();
		if (!ws) throw err;
		return ws;
	}
}

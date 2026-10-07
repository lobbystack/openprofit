// Seeds one workspace with twelve months of numbers. Run with `pnpm db:seed`.
import { eq } from "drizzle-orm";
import { authSchema, db, schema } from "#/db";
import { seedWorkspace } from "#/server/seed.server";

// `--owner=you@example.com` makes that signed-in user a member of the
// seeded workspace.
async function attachOwner(workspaceId: string, email: string) {
	const user = await db.query.user.findFirst({
		where: eq(authSchema.user.email, email),
	});
	if (!user) {
		console.log(`No user with email ${email}. Sign in once, then rerun.`);
		return;
	}
	await db
		.insert(schema.workspaceMembers)
		.values({ workspaceId, userId: user.id, role: "owner" })
		.onConflictDoNothing();
	console.log(`${email} now owns the seeded workspace.`);
}

async function main() {
	const owner = process.argv.find((a) => a.startsWith("--owner="))?.slice(8);
	// The public demo workspace doesn't count: nobody can be its member.
	const existing = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.demo, false),
	});
	if (existing) {
		if (owner) await attachOwner(existing.id, owner);
		else console.log(`Workspace "${existing.name}" exists. Delete data/openprofit to reseed.`);
		return;
	}
	const seeded = await db.transaction((tx) =>
		seedWorkspace(tx, { name: "Acme Labs", slug: "acme" }),
	);
	if (owner) await attachOwner(seeded.ws.id, owner);
	console.log(
		`Seeded ${seeded.ws.name}: ${seeded.products} products, ${seeded.connections} connections, ${seeded.lines} lines.`,
	);
}

main().then(() => process.exit(0));

import { redirect } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth";

export type SessionUser = { id: string; email: string; name: string };

export async function sessionUser(): Promise<SessionUser | null> {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session) return null;
	const { id, email, name } = session.user;
	return { id, email, name };
}

// For loaders: the signed-in user, or a redirect to /login.
export async function requireUser(): Promise<SessionUser> {
	const user = await sessionUser();
	if (!user) throw redirect({ to: "/login" });
	return user;
}

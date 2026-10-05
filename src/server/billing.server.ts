import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "#/db";
import type { Plan } from "#/lib/plans";
import "./env";

// Hosted mode: plans, Polar checkout and the webhook that moves a workspace
// between plans. Everything here is inert when APP_MODE is not "cloud".
export const isCloud = process.env.APP_MODE === "cloud";

const API = process.env.POLAR_API_URL ?? "https://api.polar.sh";
const headers = () => ({
	Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
	"Content-Type": "application/json",
});

const productFor = (plan: Plan) =>
	plan === "indie"
		? process.env.POLAR_PRODUCT_INDIE
		: plan === "pro"
			? process.env.POLAR_PRODUCT_PRO
			: undefined;

const planFor = (productId: string): Plan | null =>
	productId === process.env.POLAR_PRODUCT_INDIE
		? "indie"
		: productId === process.env.POLAR_PRODUCT_PRO
			? "pro"
			: null;

async function polar<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${API}${path}`, {
		method: "POST",
		headers: headers(),
		body: JSON.stringify(body),
	});
	if (!res.ok) throw new Error(`Polar ${res.status}: ${await res.text()}`);
	return res.json() as Promise<T>;
}

export async function checkoutUrl(
	ws: { id: string },
	plan: Plan,
	email: string,
) {
	const product = productFor(plan);
	if (!product) throw new Error(`No Polar product for ${plan}`);
	const r = await polar<{ url: string }>("/v1/checkouts/", {
		products: [product],
		customer_email: email,
		external_customer_id: ws.id,
		success_url: `${process.env.APP_URL}/app/settings`,
		metadata: { workspaceId: ws.id },
	});
	return r.url;
}

export async function portalUrl(ws: { id: string }) {
	const r = await polar<{ customer_portal_url: string }>(
		"/v1/customer-sessions/",
		{ external_customer_id: ws.id },
	);
	return r.customer_portal_url;
}

// Standard Webhooks signature: HMAC-SHA256 over `${id}.${timestamp}.${body}`.
export function verifyWebhook(body: string, h: Headers) {
	const secret = process.env.POLAR_WEBHOOK_SECRET;
	const id = h.get("webhook-id");
	const ts = h.get("webhook-timestamp");
	const sig = h.get("webhook-signature");
	if (!secret || !id || !ts || !sig) return false;
	if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
	// Standard Webhooks secrets are base64 behind a "whsec_" prefix.
	const key = secret.startsWith("whsec_")
		? Buffer.from(secret.slice(6), "base64")
		: Buffer.from(secret);
	const expected = createHmac("sha256", key)
		.update(`${id}.${ts}.${body}`)
		.digest();
	return sig.split(" ").some((part) => {
		const [, value] = part.split(",");
		if (!value) return false;
		const given = Buffer.from(value, "base64");
		return given.length === expected.length && timingSafeEqual(given, expected);
	});
}

type Subscription = {
	status: string;
	product_id: string;
	metadata?: { workspaceId?: string };
	customer?: { external_id?: string | null };
};

// Active subscription sets the plan; a revoked one drops to free. A
// canceled subscription stays on its plan until Polar revokes it.
export async function applyWebhook(event: {
	type: string;
	data: Subscription;
}) {
	if (!event.type.startsWith("subscription.")) return;
	const s = event.data;
	const wsId = s.metadata?.workspaceId ?? s.customer?.external_id;
	if (!wsId) return;
	const plan =
		s.status === "active"
			? planFor(s.product_id)
			: s.status === "revoked"
				? "free"
				: null;
	if (!plan) return;
	await db
		.update(schema.workspaces)
		.set({ plan })
		.where(eq(schema.workspaces.id, wsId));
}

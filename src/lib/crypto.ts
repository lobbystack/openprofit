import "@tanstack/react-start/server-only";
// AES-256-GCM over Web Crypto, so it runs on Node and on Workers.
// SECRET_KEY is 32 random bytes, base64. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

const enc = new TextEncoder();
const dec = new TextDecoder();

let cachedKey: CryptoKey | null = null;

async function key() {
	if (cachedKey) return cachedKey;
	const raw = process.env.SECRET_KEY;
	if (!raw) throw new Error("SECRET_KEY is not set");
	const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
	if (bytes.length !== 32) throw new Error("SECRET_KEY must be 32 bytes");
	cachedKey = await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
	return cachedKey;
}

const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// Output: "v1.<iv>.<ciphertext>" with both parts base64.
export async function encrypt(value: unknown) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = enc.encode(JSON.stringify(value));
	const out = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await key(),
		data,
	);
	return `v1.${toB64(iv)}.${toB64(new Uint8Array(out))}`;
}

export async function decrypt<T = unknown>(payload: string): Promise<T> {
	const [version, iv, body] = payload.split(".");
	if (version !== "v1" || !iv || !body) throw new Error("Bad ciphertext");
	const out = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromB64(iv) },
		await key(),
		fromB64(body),
	);
	return JSON.parse(dec.decode(out)) as T;
}

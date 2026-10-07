import dns from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, isIPv6, type LookupFunction } from "node:net";

// Requests to URLs someone else chose (alert webhooks, OAuth client
// metadata documents), so they can't reach addresses on the server's own
// network. IPv4 rules also match IPv4-mapped IPv6 (::ffff:127.0.0.1).
const PRIVATE = new BlockList();
for (const [net, bits] of [
	["0.0.0.0", 8], // "this network"; 0.0.0.0 reaches localhost
	["10.0.0.0", 8],
	["100.64.0.0", 10], // CGNAT
	["127.0.0.0", 8],
	["169.254.0.0", 16], // link-local, cloud metadata
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["224.0.0.0", 4], // multicast
	["240.0.0.0", 4], // reserved, broadcast
] as const)
	PRIVATE.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
	["::", 96], // unspecified, loopback, IPv4-compatible
	["64:ff9b::", 96], // NAT64 to IPv4
	["64:ff9b:1::", 48],
	["fc00::", 7], // unique local
	["fe80::", 10], // link-local
	["fec0::", 10], // site-local
	["ff00::", 8], // multicast
] as const)
	PRIVATE.addSubnet(net, bits, "ipv6");

export const isPrivate = (ip: string) =>
	PRIVATE.check(ip, isIPv6(ip) ? "ipv6" : "ipv4");
export const PUBLIC_ONLY = "Use an address on the public internet";

// For the socket's `lookup`: resolves the name, fails if any address is
// private, and hands over only the addresses it checked, so the request
// connects to exactly those and a second DNS answer can't swap them.
const publicLookup: LookupFunction = (hostname, options, callback) =>
	dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
		if (err) return callback(err, "");
		if (addrs.some((a) => isPrivate(a.address)))
			return callback(new Error(PUBLIC_ONLY), "");
		if (options.all) return callback(null, addrs);
		callback(null, addrs[0].address, addrs[0].family);
	});

// One request with node:http(s) rather than fetch, which has no `lookup`.
// Never follows redirects; TLS still verifies the certificate against the
// hostname. `publicOnly` refuses private addresses, IP literals included
// (sockets skip `lookup` for those). Bodies past `maxBytes` fail.
export function publicRequest(
	url: URL,
	opts: {
		method: "GET" | "POST";
		headers?: Record<string, string>;
		body?: string;
		publicOnly: boolean;
		timeoutMs: number;
		maxBytes?: number;
	},
): Promise<{ status: number; text: string }> {
	const literal = url.hostname.replace(/^\[|\]$/g, "");
	if (opts.publicOnly && isIP(literal) && isPrivate(literal))
		return Promise.reject(new Error(PUBLIC_ONLY));
	const max = opts.maxBytes ?? 64_000;
	return new Promise((resolve, reject) => {
		const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
			url,
			{
				method: opts.method,
				headers: opts.headers,
				lookup: opts.publicOnly ? publicLookup : undefined,
				// A pooled socket could have connected without that check.
				agent: false,
				signal: AbortSignal.timeout(opts.timeoutMs),
			},
			(res) => {
				const chunks: Buffer[] = [];
				let size = 0;
				res.on("data", (c: Buffer) => {
					size += c.length;
					if (size > max) req.destroy(new Error("Response too large"));
					else chunks.push(c);
				});
				res.on("end", () =>
					resolve({
						status: res.statusCode ?? 0,
						text: Buffer.concat(chunks).toString("utf8"),
					}),
				);
				res.on("error", reject);
			},
		);
		req.on("error", reject);
		req.end(opts.body);
	});
}

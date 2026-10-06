import {
	type Attributes,
	INVALID_SPAN_CONTEXT,
	type Span,
	SpanKind,
	SpanStatusCode,
	trace,
} from "@opentelemetry/api";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BatchLogRecordProcessor,
	LoggerProvider,
} from "@opentelemetry/sdk-logs";
import {
	BasicTracerProvider,
	BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { PostHog } from "posthog-node";
import pkg from "../../package.json";
import "./env";

// Server logs and traces go to PostHog over OTLP; exceptions go through
// posthog-node for error tracking. All of it is off without POSTHOG_KEY.
// Nothing here carries a user id.

const key = process.env.POSTHOG_KEY;
const host = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";

// Emails, bearer headers and anything shaped like a key or token are
// replaced before text leaves the server.
export function scrub(text: string) {
	return text
		.replace(/[^\s@"'<>()]+@[^\s@"'<>()]+\.[a-z]{2,}/gi, "[email]")
		.replace(/\b(Bearer|Basic)\s+\S+/gi, "$1 [secret]")
		.replace(
			/\b[a-z]{2,12}(?:[_-][a-z0-9]{2,12})*[_-][A-Za-z0-9]{16,}\b/gi,
			"[secret]",
		)
		.replace(/[A-Za-z0-9+/=_-]{40,}/g, "[secret]");
}

// What an error may say outside the server. Provider errors carry the
// provider's response text, so only their status goes out.
export function safeError(err: unknown) {
	if (!(err instanceof Error)) return scrub(String(err));
	if (err.name === "ConnectorError")
		return `ConnectorError ${(err as Error & { status?: number }).status ?? ""}`.trim();
	return scrub(err.stack ?? `${err.name}: ${err.message}`);
}

// The app's own log lines, by their tag. Anything else stays local.
const TAGGED = /^\[(sync|weekly|billing|scheduler)\]/;

// Span names use route patterns, so ids and slugs stay out of them.
const ROUTES: [RegExp, string][] = [
	[/^\/app\/connections\/[^/]+$/, "/app/connections/$id"],
	[/^\/app\/connect\/[^/]+$/, "/app/connect/$provider"],
	[/^\/p\/[^/]+\/[^/]+$/, "/p/$workspace/$product"],
	[/^\/(docs|integrations|compare)\/[^/]+$/, "/$1/$slug"],
	[/^\/api\/auth\/.*/, "/api/auth/$"],
	[/^\/_serverFn\/.*/, "/_serverFn/$"],
];
export function routePattern(path: string) {
	for (const [re, pattern] of ROUTES)
		if (re.test(path)) return path.replace(re, pattern);
	return path;
}

function setup() {
	if (!key) return null;
	const resource = resourceFromAttributes({
		"service.name": "openprofit",
		"service.version": pkg.version,
		"deployment.environment": process.env.NODE_ENV ?? "development",
	});
	const auth = { Authorization: `Bearer ${key}` };

	const logs = new LoggerProvider({
		resource,
		processors: [
			new BatchLogRecordProcessor({
				exporter: new OTLPLogExporter({
					url: `${host}/i/v1/logs`,
					headers: auth,
				}),
			}),
		],
	});
	const logger = logs.getLogger("openprofit");
	// The app's tagged console.info, warn and error lines also become log
	// records, scrubbed. console.log stays local: without an email provider
	// it prints sign-in links.
	const levels = [
		["info", SeverityNumber.INFO],
		["warn", SeverityNumber.WARN],
		["error", SeverityNumber.ERROR],
	] as const;
	for (const [level, severityNumber] of levels) {
		const original = console[level].bind(console);
		console[level] = (...args: unknown[]) => {
			original(...args);
			if (typeof args[0] !== "string" || !TAGGED.test(args[0])) return;
			logger.emit({
				severityNumber,
				severityText: level.toUpperCase(),
				body: args
					.map((a) => (a instanceof Error ? safeError(a) : scrub(String(a))))
					.join(" "),
			});
		};
	}

	const tracer = new BasicTracerProvider({
		resource,
		spanProcessors: [
			new BatchSpanProcessor(
				new OTLPTraceExporter({ url: `${host}/i/v1/traces`, headers: auth }),
			),
		],
	}).getTracer("openprofit");

	// Exceptions are rare; send each one right away.
	const posthog = new PostHog(key, {
		host,
		enableExceptionAutocapture: true,
		flushAt: 1,
		flushInterval: 0,
	});
	return { tracer, posthog };
}

// Once per process, also across Vite reloads in dev.
declare global {
	var __openprofitObservability: ReturnType<typeof setup> | undefined;
}
globalThis.__openprofitObservability ??= setup();
const o = globalThis.__openprofitObservability;

// Runs fn inside a span; records the error and rethrows on failure.
export async function traced<T>(
	name: string,
	attributes: Attributes,
	fn: (span: Span) => Promise<T>,
	kind = SpanKind.INTERNAL,
): Promise<T> {
	const span = o
		? o.tracer.startSpan(name, { kind, attributes })
		: trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
	try {
		return await fn(span);
	} catch (err) {
		span.recordException({
			name: err instanceof Error ? err.name : "Error",
			message: safeError(err),
		});
		span.setStatus({ code: SpanStatusCode.ERROR });
		throw err;
	} finally {
		span.end();
	}
}

// Server exceptions, sent without a person. Provider and validation
// errors are the user's to fix, not bugs, so they stay out; the rest are
// scrubbed.
export function reportError(err: unknown, props?: Record<string, unknown>) {
	if (!o) return;
	const name = err instanceof Error ? err.name : "";
	if (name === "ConnectorError" || name === "ZodError") return;
	const safe = new Error(
		scrub(err instanceof Error ? err.message : String(err)),
	);
	safe.name = name || "Error";
	if (err instanceof Error && err.stack) safe.stack = scrub(err.stack);
	o.posthog.captureException(safe, undefined, props);
}

export { SpanKind };

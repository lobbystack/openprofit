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
	// console.info, warn and error also become log records. console.log
	// stays local: without an email provider it prints sign-in links.
	const levels = [
		["info", SeverityNumber.INFO],
		["warn", SeverityNumber.WARN],
		["error", SeverityNumber.ERROR],
	] as const;
	for (const [level, severityNumber] of levels) {
		const original = console[level].bind(console);
		console[level] = (...args: unknown[]) => {
			original(...args);
			logger.emit({
				severityNumber,
				severityText: level.toUpperCase(),
				body: args
					.map((a) => (a instanceof Error ? (a.stack ?? a.message) : String(a)))
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
		span.recordException(err as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });
		throw err;
	} finally {
		span.end();
	}
}

// Server exceptions, sent without a person.
export function reportError(err: unknown, props?: Record<string, unknown>) {
	o?.posthog.captureException(err, undefined, props);
}

export { SpanKind };

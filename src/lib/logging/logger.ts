import "server-only";

import * as Sentry from "@sentry/nextjs";
import { redact } from "./redact";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function enabled(level: LogLevel) {
  const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
  return priorities[level] >= (priorities[configured] ?? priorities.info);
}

export function writeLog(level: LogLevel, event: string, context: LogContext = {}) {
  if (!enabled(level)) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "clearkey-connect",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    ...redact(context) as LogContext,
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  debug: (event: string, context?: LogContext) => writeLog("debug", event, context),
  info: (event: string, context?: LogContext) => writeLog("info", event, context),
  warn: (event: string, context?: LogContext) => writeLog("warn", event, context),
  error(event: string, error: unknown, context: LogContext = {}) {
    writeLog("error", event, { ...context, error });
    Sentry.captureException(error, { tags: { event }, extra: redact(context) as LogContext });
  },
};

export function requestContext(request: Request) {
  return {
    requestId: request.headers.get("x-request-id") ?? request.headers.get("x-vercel-id") ?? crypto.randomUUID(),
    method: request.method,
    path: new URL(request.url).pathname,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  };
}

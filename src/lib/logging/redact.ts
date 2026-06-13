const sensitiveKey = /authorization|cookie|password|passwd|secret|token|api[-_]?key|session|ssn|tax[-_]?id|card|account[-_]?number/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[TRUNCATED]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack?.split("\n").slice(0, 8).join("\n") };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : redact(item, depth + 1)]),
    );
  }
  if (typeof value === "string" && value.length > 4000) return `${value.slice(0, 4000)}...[TRUNCATED]`;
  return value;
}

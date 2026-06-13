import { describe, expect, it } from "vitest";
import { calculateAuditHash } from "./audit-hash";
import { redact } from "./redact";

describe("security logging", () => {
  it("redacts sensitive fields recursively", () => {
    expect(redact({ email: "user@example.com", nested: { authorization: "Bearer private", taxId: "123" } })).toEqual({
      email: "user@example.com",
      nested: { authorization: "[REDACTED]", taxId: "[REDACTED]" },
    });
  });

  it("creates deterministic hashes independent of key order", () => {
    expect(calculateAuditHash({ b: 2, a: 1 }, "GENESIS")).toBe(calculateAuditHash({ a: 1, b: 2 }, "GENESIS"));
  });

  it("binds each record to the previous hash", () => {
    expect(calculateAuditHash({ action: "invoice.post" }, "first")).not.toBe(
      calculateAuditHash({ action: "invoice.post" }, "second"),
    );
  });
});

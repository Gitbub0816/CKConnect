import { describe, expect, it } from "vitest";
import { calculateApplicationFee, validateBalancedJournal } from "./accounting";

describe("accounting invariants", () => {
  it("accepts a balanced journal", () => {
    expect(
      validateBalancedJournal([
        { accountId: "cash", debit: 100, credit: 0 },
        { accountId: "revenue", debit: 0, credit: 100 },
      ]),
    ).toBe(true);
  });

  it("rejects an unbalanced journal", () => {
    expect(
      validateBalancedJournal([
        { accountId: "cash", debit: 100, credit: 0 },
        { accountId: "revenue", debit: 0, credit: 99 },
      ]),
    ).toBe(false);
  });

  it("calculates platform fees in minor units", () => {
    expect(calculateApplicationFee(10_000, 250)).toBe(250);
  });
});

import Decimal from "decimal.js";

export type JournalDraftLine = {
  accountId: string;
  debit: Decimal.Value;
  credit: Decimal.Value;
};

export function validateBalancedJournal(lines: JournalDraftLine[]) {
  if (lines.length < 2) return false;

  const totals = lines.reduce(
    (sum, line) => ({
      debit: sum.debit.plus(line.debit || 0),
      credit: sum.credit.plus(line.credit || 0),
    }),
    { debit: new Decimal(0), credit: new Decimal(0) },
  );

  return totals.debit.greaterThan(0) && totals.debit.equals(totals.credit);
}

export function calculateApplicationFee(amountInMinorUnits: number, feeBps: number) {
  if (!Number.isInteger(amountInMinorUnits) || amountInMinorUnits < 0) {
    throw new Error("Amount must be a non-negative integer");
  }
  return Math.round((amountInMinorUnits * feeBps) / 10_000);
}

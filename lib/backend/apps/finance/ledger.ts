export const MAX_PAYMENT_CENTS = 500_000;
export const MIN_PAYMENT_CENTS = 1;
export const INSTANT_TRANSFER_FEE_RATE = 0.0175;
export const INSTANT_TRANSFER_FEE_MIN_CENTS = 25;
export const INSTANT_TRANSFER_FEE_MAX_CENTS = 2_500;
export const WELCOME_BONUS_CENTS = 1_000;
export const DEFAULT_CREDIT_LIMIT_CENTS = 300_000;

export type TransferSpeed = 'instant' | 'standard';

export function isValidAmount(cents: unknown): cents is number {
  return (
    typeof cents === 'number' &&
    Number.isInteger(cents) &&
    cents >= MIN_PAYMENT_CENTS &&
    cents <= MAX_PAYMENT_CENTS
  );
}

export function instantTransferFee(amountCents: number): number {
  const raw = Math.round(amountCents * INSTANT_TRANSFER_FEE_RATE);
  return Math.min(
    INSTANT_TRANSFER_FEE_MAX_CENTS,
    Math.max(INSTANT_TRANSFER_FEE_MIN_CENTS, raw),
  );
}

export function transferFee(amountCents: number, speed: TransferSpeed) {
  return speed === 'instant' ? instantTransferFee(amountCents) : 0;
}

/**
 * Splits a total evenly across `count` people. Remainder cents are spread one
 * at a time starting from the first participant so the shares always sum to
 * the total.
 */
export function splitEvenly(totalCents: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Split needs at least one participant');
  }

  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

export function sharesSumTo(shares: number[], totalCents: number) {
  return shares.reduce((sum, share) => sum + share, 0) === totalCents;
}

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export function normalizeHandle(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[\s_]+/g, '-');
}

export function isValidHandle(handle: string) {
  return HANDLE_PATTERN.test(handle);
}

export function generateLast4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Determines how a debit is covered: first from the balance, then from a
 * linked funding source for whatever remains.
 */
export function coverDebit(
  balanceCents: number,
  amountCents: number,
  hasFundingSource: boolean,
) {
  const fromBalance = Math.min(balanceCents, amountCents);
  const fromSource = amountCents - fromBalance;

  if (fromSource > 0 && !hasFundingSource) {
    return { ok: false as const, fromBalance, fromSource };
  }

  return { ok: true as const, fromBalance, fromSource };
}

/**
 * Money formatting for display. The ledger API uses exponent 2 (minor units
 * = 1/100) for all currencies — mirror that contract instead of guessing
 * from Intl's per-currency exponents.
 */

const TWO_DECIMALS = 2;

export function formatSignedMinor(amountMinor: string, currency: string): string {
  const minor = BigInt(amountMinor);
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const scale = 10n ** BigInt(TWO_DECIMALS);
  const whole = (absolute / scale).toString();
  const fraction = (absolute % scale).toString().padStart(TWO_DECIMALS, '0');
  const grouped = Number(whole).toLocaleString('en-US');
  return `${negative ? '-' : ''}${grouped}.${fraction} ${currency}`;
}

/** Decimal string straight from the balance endpoint → localized display. */
export function formatDecimal(decimal: string, currency: string): string {
  const value = Number(decimal);
  if (!Number.isFinite(value)) return `${decimal} ${currency}`;
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: TWO_DECIMALS,
    maximumFractionDigits: TWO_DECIMALS,
  })} ${currency}`;
}

export function isNegativeMinor(amountMinor: string): boolean {
  return BigInt(amountMinor) < 0n;
}

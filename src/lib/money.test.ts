import { describe, expect, it } from 'vitest';
import { formatDecimal, formatSignedMinor, isNegativeMinor } from './money';

describe('formatSignedMinor', () => {
  it('formats positive minor units', () => {
    expect(formatSignedMinor('25075', 'USD')).toBe('250.75 USD');
  });

  it('formats negative values with grouping', () => {
    expect(formatSignedMinor('-1234567', 'EUR')).toBe('-12,345.67 EUR');
  });

  it('pads single-digit fractions', () => {
    expect(formatSignedMinor('5', 'USD')).toBe('0.05 USD');
  });

  it('formats zero', () => {
    expect(formatSignedMinor('0', 'USD')).toBe('0.00 USD');
  });

  it('handles values beyond Number.MAX_SAFE_INTEGER without precision loss', () => {
    // 90,071,992,547,409.93 — would lose .93 as a JS number.
    expect(formatSignedMinor('9007199254740993', 'USD')).toBe('90,071,992,547,409.93 USD');
  });
});

describe('formatDecimal', () => {
  it('formats the balance endpoint decimal string', () => {
    expect(formatDecimal('250.75', 'USD')).toBe('250.75 USD');
  });

  it('groups thousands', () => {
    expect(formatDecimal('1234567.89', 'USD')).toBe('1,234,567.89 USD');
  });

  it('falls back to the raw string on garbage input', () => {
    expect(formatDecimal('not-a-number', 'USD')).toBe('not-a-number USD');
  });
});

describe('isNegativeMinor', () => {
  it('detects debits', () => {
    expect(isNegativeMinor('-1')).toBe(true);
    expect(isNegativeMinor('0')).toBe(false);
    expect(isNegativeMinor('1')).toBe(false);
  });
});

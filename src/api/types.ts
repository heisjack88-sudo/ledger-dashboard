/**
 * Types mirroring the ledger-core HTTP contract (src/http/app.ts).
 * Amounts are decimal/minor-unit STRINGS — never numbers — so no IEEE-754
 * precision is lost crossing the wire.
 */

export type AccountKind = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  ownerId: string;
  currency: string;
  kind: AccountKind;
  allowNegative: boolean;
  createdAt: string;
}

export interface Balance {
  accountId: string;
  currency: string;
  /** Decimal string, e.g. "250.75". */
  balance: string;
  /** Signed integer minor units as a string, e.g. "-25075". */
  balanceMinor: string;
}

export interface Posting {
  id: string;
  accountId: string;
  amountMinor: string;
  currency: string;
}

export type EntryKind = 'transfer' | 'deposit' | 'withdrawal' | 'fee' | 'reversal';

export interface Entry {
  id: string;
  kind: EntryKind;
  status: 'posted' | 'reversed';
  correlationId: string | null;
  createdAt: string;
  postings: Posting[];
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface OpenAccountInput {
  ownerId: string;
  currency: string;
  kind?: AccountKind;
  allowNegative?: boolean;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  /** Decimal string ("10.50"); parsed server-side, never a float. */
  amount: string;
  currency: string;
  correlationId?: string;
}

/**
 * RFC 9457 problem document — the API's error shape for every non-2xx
 * (application/problem+json). Known optional members:
 *  - retryAfter (429 RATE_LIMITED)
 *  - issues[]   (400 INVALID_REQUEST, from Zod validation)
 *  - accountId  (404 ACCOUNT_NOT_FOUND)
 * `type` URIs are under https://ledger-core.dev/problems/.
 */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  retryAfter?: number;
  issues?: { path: string; message: string }[];
  [key: string]: unknown;
}

import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Entry, TransferInput } from '../api/types';
import EmptyState from '../components/EmptyState';
import ProblemBanner from '../components/ProblemBanner';
import ShortId from '../components/ShortId';
import { formatSignedMinor } from '../lib/money';
import { useAccounts } from '../lib/useAccounts';

const AMOUNT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

interface Success {
  entry: Entry;
  replayed: boolean;
}

export default function Transfers() {
  const accounts = useAccounts();

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<Success | null>(null);
  const [clientIssue, setClientIssue] = useState<string | null>(null);

  /**
   * One Idempotency-Key per *user intent*: generated on first submit, REUSED
   * while the payload is unchanged (so retries/double-clicks are safe), and
   * rotated as soon as the payload changes (a different intent = a different
   * transfer). Cleared on success.
   */
  const idempotencyKey = useRef<string | null>(null);
  const signedPayload = useRef<string | null>(null);

  const from = accounts.find((account) => account.id === fromId);
  const to = accounts.find((account) => account.id === toId);

  const transferMutation = useMutation({
    mutationFn: ({ input, key }: { input: TransferInput; key: string }) =>
      api.transfer(input, key),
    onSuccess: (result) => {
      setSuccess(result);
      setError(null);
      setClientIssue(null);
      setAmount('');
      idempotencyKey.current = null;
      signedPayload.current = null;
    },
    onError: (mutationError) => {
      setSuccess(null);
      setError(mutationError);
    },
  });

  if (accounts.length < 2) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Transfers</h1>
        <EmptyState
          title="Two accounts required"
          description="A transfer moves money between two ledger accounts. Add or create at least two accounts first."
          action={
            <Link
              to="/accounts"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Go to accounts
            </Link>
          }
        />
      </div>
    );
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSuccess(null);
    setError(null);
    setClientIssue(null);

    const trimmedAmount = amount.trim().replace(',', '.');
    if (!from || !to) return;
    if (from.id === to.id) {
      setClientIssue('Source and destination must be different accounts.');
      return;
    }
    if (from.currency !== to.currency) {
      setClientIssue(
        `Currency mismatch: source is ${from.currency}, destination is ${to.currency}. The ledger rejects cross-currency transfers (422 CURRENCY_MISMATCH).`,
      );
      return;
    }
    if (!AMOUNT_PATTERN.test(trimmedAmount) || Number(trimmedAmount) <= 0) {
      setClientIssue('Enter a positive amount with up to two decimals, e.g. 25.07.');
      return;
    }

    const input: TransferInput = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: trimmedAmount,
      currency: from.currency,
      ...(correlationId.trim() ? { correlationId: correlationId.trim() } : {}),
    };

    const intent = JSON.stringify(input);
    if (idempotencyKey.current === null || signedPayload.current !== intent) {
      idempotencyKey.current = crypto.randomUUID();
      signedPayload.current = intent;
    }

    transferMutation.mutate({ input, key: idempotencyKey.current });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">New transfer</h1>
        <p className="mt-1 text-sm text-slate-500">
          Posted as a balanced double-entry. Retries reuse the same Idempotency-Key, so
          money never moves twice.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="from-account">
                  From
                </label>
                <select
                  id="from-account"
                  className={inputClass}
                  value={fromId}
                  onChange={(event) => setFromId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select account…
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label ?? account.id.slice(0, 8)}… ({account.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="to-account">
                  To
                </label>
                <select
                  id="to-account"
                  className={inputClass}
                  value={toId}
                  onChange={(event) => setToId(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select account…
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label ?? account.id.slice(0, 8)}… ({account.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="amount">
                  Amount {from && <span className="text-slate-400">({from.currency})</span>}
                </label>
                <input
                  id="amount"
                  className={inputClass + ' tabular-nums'}
                  placeholder="0.00"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="correlation-id">
                  Correlation ID <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="correlation-id"
                  className={inputClass + ' font-mono'}
                  placeholder="order-123"
                  maxLength={128}
                  value={correlationId}
                  onChange={(event) => setCorrelationId(event.target.value)}
                />
              </div>
            </div>

            {clientIssue && (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                {clientIssue}
              </div>
            )}
            <ProblemBanner error={error} />

            <button
              type="submit"
              disabled={transferMutation.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {transferMutation.isPending ? 'Posting…' : 'Post transfer'}
            </button>
          </form>
        </section>

        <aside className="space-y-4 lg:col-span-2">
          {success ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-emerald-800">
                  {success.replayed ? 'Replayed — no double charge' : 'Entry posted'}
                </h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  {success.entry.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                Entry <ShortId id={success.entry.id} />
              </p>
              <ul className="mt-3 space-y-2">
                {success.entry.postings.map((posting) => (
                  <li
                    key={posting.id}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-600">
                      <ShortId id={posting.accountId} />
                      {posting.accountId === fromId && (
                        <span className="text-[11px] text-slate-400">source</span>
                      )}
                      {posting.accountId === toId && (
                        <span className="text-[11px] text-slate-400">dest</span>
                      )}
                    </span>
                    <span
                      className={`font-medium tabular-nums ${
                        BigInt(posting.amountMinor) < 0n ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatSignedMinor(posting.amountMinor, posting.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to={`/activity?account=${fromId}`}
                className="mt-3 inline-block text-xs font-medium text-emerald-700 hover:underline"
              >
                View full activity →
              </Link>
            </section>
          ) : (
            <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
              <h2 className="text-sm font-semibold text-slate-700">What happens on post</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-4">
                <li>Server validates ids, currency match and positive amount.</li>
                <li>
                  Two postings (debit source, credit destination) are committed atomically —
                  an overdraw rolls the whole entry back with <code>422 INSUFFICIENT_FUNDS</code>.
                </li>
                <li>Same Idempotency-Key again returns the original entry with 200.</li>
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

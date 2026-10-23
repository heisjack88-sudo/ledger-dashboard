import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Entry } from '../api/types';
import EmptyState from '../components/EmptyState';
import ProblemBanner from '../components/ProblemBanner';
import ShortId from '../components/ShortId';
import { formatSignedMinor, isNegativeMinor } from '../lib/money';
import { useAccounts } from '../lib/useAccounts';

const KIND_TONE: Record<Entry['kind'], string> = {
  transfer: 'bg-sky-50 text-sky-700',
  deposit: 'bg-emerald-50 text-emerald-700',
  withdrawal: 'bg-amber-50 text-amber-700',
  fee: 'bg-slate-100 text-slate-600',
  reversal: 'bg-rose-50 text-rose-700',
};

export default function Activity() {
  const accounts = useAccounts();
  const [searchParams] = useSearchParams();
  const requestedAccount = searchParams.get('account');

  const [accountId, setAccountId] = useState(requestedAccount ?? '');
  const initialAccount = useRef(requestedAccount ?? '');

  // Honor ?account= deep links once, then fall back to the first account.
  useEffect(() => {
    if (initialAccount.current) {
      setAccountId(initialAccount.current);
      initialAccount.current = '';
    } else if (accountId === '' || !accounts.some((a) => a.id === accountId)) {
      setAccountId(accounts[0]?.id ?? '');
    }
  }, [accounts, accountId]);

  const entriesQuery = useInfiniteQuery({
    queryKey: ['entries', accountId],
    queryFn: ({ pageParam }) =>
      api.listEntries(accountId, { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: accountId !== '',
  });

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
        <EmptyState
          title="No accounts to inspect"
          description="Add or create an account first — every journal entry posted against it will show up here."
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

  const entries = entriesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-slate-500">
            Journal entries — cursor-paginated, straight from the ledger.
          </p>
        </div>
        <label className="text-xs font-medium text-slate-600">
          Account
          <select
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label ?? `${account.id.slice(0, 8)}…`} ({account.currency})
              </option>
            ))}
          </select>
        </label>
      </header>

      <ProblemBanner error={entriesQuery.error} />

      {entriesQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading entries…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No entries yet"
          description="Post a transfer and it will appear here as a balanced double-entry journal record."
          action={
            <Link
              to="/transfers"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Make a transfer
            </Link>
          }
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const posting = entry.postings.find((p) => p.accountId === accountId);
                  const amount = posting ? formatSignedMinor(posting.amountMinor, posting.currency) : '—';
                  const negative = posting ? isNegativeMinor(posting.amountMinor) : false;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {new Date(entry.createdAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${KIND_TONE[entry.kind]}`}
                        >
                          {entry.kind}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums ${
                          negative ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {amount}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.status}</td>
                      <td className="px-4 py-3">
                        <ShortId id={entry.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="flex items-center justify-center gap-3">
            {entriesQuery.hasNextPage && (
              <button
                type="button"
                onClick={() => entriesQuery.fetchNextPage()}
                disabled={entriesQuery.isFetchingNextPage}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {entriesQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            )}
            <span className="text-xs text-slate-400">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} loaded
            </span>
          </div>
        </>
      )}
    </div>
  );
}

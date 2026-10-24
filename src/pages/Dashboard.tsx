import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Balance } from '../api/types';
import EmptyState from '../components/EmptyState';
import ProblemBanner from '../components/ProblemBanner';
import ShortId from '../components/ShortId';
import { formatDecimal } from '../lib/money';
import { useAccounts } from '../lib/useAccounts';
import type { RegisteredAccount } from '../lib/registry';

function AccountCard({
  account,
  balance,
}: {
  account: RegisteredAccount;
  balance: Balance | undefined;
}) {
  return (
    <Link
      to={`/activity?account=${account.id}`}
      className="group rounded-xl border border-slate-200 bg-white p-5 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-900">
          {account.label ?? 'Account'}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">
          {account.kind}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
        {balance ? formatDecimal(balance.balance, balance.currency) : '…'}
      </p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <ShortId id={account.id} />
        <span className="group-hover:text-emerald-600">View activity →</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const accounts = useAccounts();

  const balanceQueries = useQueries({
    queries: accounts.map((account) => ({
      queryKey: ['balance', account.id] as const,
      queryFn: () => api.getBalance(account.id),
    })),
  });

  const firstError = balanceQueries.find((query) => query.error)?.error;
  const balances = balanceQueries
    .map((query) => query.data)
    .filter((data): data is Balance => data !== undefined);

  // Only same-currency amounts may be summed — never across currencies.
  const totalsByCurrency = new Map<string, number>();
  for (const balance of balances) {
    const current = totalsByCurrency.get(balance.currency) ?? 0;
    totalsByCurrency.set(balance.currency, current + Number(balance.balance));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {accounts.length === 0
              ? 'Your ledger at a glance'
              : `${accounts.length} account${accounts.length === 1 ? '' : 's'} · double-entry balanced server-side`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/accounts"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open account
          </Link>
          <Link
            to="/transfers"
            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            New transfer
          </Link>
        </div>
      </header>

      {firstError && <ProblemBanner error={firstError} />}

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Open your first account to start moving money through the double-entry ledger. Everything the API enforces — balanced entries, idempotency, overdraw rejection — is live."
          action={
            <Link
              to="/accounts"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Open an account
            </Link>
          }
        />
      ) : (
        <>
          {totalsByCurrency.size > 0 && (
            <div className="flex flex-wrap gap-3">
              {[...totalsByCurrency.entries()].map(([currency, total]) => (
                <div
                  key={currency}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"
                >
                  <span className="text-slate-500">Total held ({currency})</span>
                  <span className="ml-3 font-semibold tabular-nums text-slate-900">
                    {total.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {currency}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account, index) => (
              <AccountCard
                key={account.id}
                account={account}
                balance={balanceQueries[index]?.data}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

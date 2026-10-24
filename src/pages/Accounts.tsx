import { useState, type FormEvent } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Account, AccountKind } from '../api/types';
import EmptyState from '../components/EmptyState';
import ProblemBanner from '../components/ProblemBanner';
import ShortId from '../components/ShortId';
import { formatDecimal } from '../lib/money';
import { addAccount, removeAccount } from '../lib/registry';
import { useAccounts } from '../lib/useAccounts';

const KINDS: AccountKind[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500';

const labelClass = 'block text-xs font-medium text-slate-600 mb-1';

export default function Accounts() {
  const accounts = useAccounts();
  const queryClient = useQueryClient();

  const [ownerId, setOwnerId] = useState<string>(() => crypto.randomUUID());
  const [currency, setCurrency] = useState('USD');
  const [kind, setKind] = useState<AccountKind>('asset');
  const [allowNegative, setAllowNegative] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);
  const [lastCreated, setLastCreated] = useState<Account | null>(null);

  const [importId, setImportId] = useState('');
  const [importError, setImportError] = useState<unknown>(null);

  const remember = (account: Account) => {
    addAccount({
      id: account.id,
      ownerId: account.ownerId,
      currency: account.currency,
      kind: account.kind,
      createdAt: account.createdAt,
    });
    queryClient.invalidateQueries({ queryKey: ['balance', account.id] });
  };

  const createMutation = useMutation({
    mutationFn: api.openAccount,
    onSuccess: (account) => {
      remember(account);
      setLastCreated(account);
      setCreateError(null);
      setOwnerId(crypto.randomUUID()); // fresh owner id for the next account
    },
    onError: (error) => {
      setLastCreated(null);
      setCreateError(error);
    },
  });

  const importMutation = useMutation({
    mutationFn: api.getAccount,
    onSuccess: (account) => {
      remember(account);
      setImportId('');
      setImportError(null);
    },
    onError: (error) => setImportError(error),
  });

  const balanceQueries = useQueries({
    queries: accounts.map((account) => ({
      queryKey: ['balance', account.id] as const,
      queryFn: () => api.getBalance(account.id),
    })),
  });

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      ownerId,
      currency: currency.trim().toUpperCase(),
      kind,
      allowNegative,
    });
  };

  const handleImport = (event: FormEvent) => {
    event.preventDefault();
    const id = importId.trim();
    if (!id) return;
    importMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Created accounts are remembered locally — ledger-core has no list endpoint yet.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Open a new account</h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <label className={labelClass} htmlFor="owner-id">
                Owner ID
              </label>
              <div className="flex gap-2">
                <input
                  id="owner-id"
                  className={inputClass + ' font-mono'}
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setOwnerId(crypto.randomUUID())}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  title="Generate a new UUID"
                >
                  New
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="currency">
                  Currency (ISO-4217)
                </label>
                <input
                  id="currency"
                  className={inputClass + ' uppercase'}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value.slice(0, 3))}
                  maxLength={3}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="kind">
                  Account kind
                </label>
                <select
                  id="kind"
                  className={inputClass}
                  value={kind}
                  onChange={(event) => setKind(event.target.value as AccountKind)}
                >
                  {KINDS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={allowNegative}
                onChange={(event) => setAllowNegative(event.target.checked)}
                className="size-4 rounded border-slate-300 accent-emerald-600"
              />
              Allow negative balance (credit-style account)
            </label>

            <ProblemBanner error={createError} />

            {lastCreated && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Account created · <ShortId id={lastCreated.id} />
              </p>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Add an existing account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Paste an account UUID (verified against the API before remembering).
          </p>
          <form onSubmit={handleImport} className="mt-4 flex gap-2">
            <input
              className={inputClass + ' font-mono'}
              placeholder="00000000-0000-0000-0000-000000000000"
              value={importId}
              onChange={(event) => setImportId(event.target.value)}
              required
            />
            <button
              type="submit"
              disabled={importMutation.isPending}
              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {importMutation.isPending ? 'Checking…' : 'Add'}
            </button>
          </form>
          <div className="mt-3">
            <ProblemBanner error={importError} />
          </div>
        </section>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts in this browser"
          description="Create one above, or add an existing account by UUID. Balances are always read live from the ledger."
        />
      ) : (
        <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Kind</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Currency</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((account, index) => {
                const balance = balanceQueries[index]?.data;
                return (
                  <tr key={account.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <ShortId id={account.id} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{account.kind}</td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{account.currency}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                      {balance
                        ? formatDecimal(balance.balance, balance.currency)
                        : balanceQueries[index]?.isError
                          ? '—'
                          : '…'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeAccount(account.id)}
                        className="text-xs text-slate-400 hover:text-rose-600"
                        title="Remove from this browser (ledger data is untouched)"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

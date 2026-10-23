/**
 * Local account registry.
 *
 * ledger-core has no "list accounts" endpoint (roadmap item), so the
 * dashboard remembers every account it creates or the user pastes, in
 * localStorage. The ledger itself remains the source of truth for balances;
 * this is only a UI convenience list.
 */

export interface RegisteredAccount {
  id: string;
  ownerId: string;
  currency: string;
  kind: string;
  createdAt: string;
  /** Optional user-provided nickname for display. */
  label?: string;
}

const STORAGE_KEY = 'ledger-dashboard.accounts.v1';

let accounts: RegisteredAccount[] = load();
const listeners = new Set<() => void>();

function load(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RegisteredAccount[]) : [];
  } catch {
    // Corrupted storage must not break the app; start empty and overwrite.
    return [];
  }
}

function persist(next: RegisteredAccount[]): void {
  accounts = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private-mode / quota failures: the in-memory list still works.
  }
  for (const listener of listeners) listener();
}

export function listAccounts(): RegisteredAccount[] {
  return accounts;
}

export function addAccount(account: RegisteredAccount): void {
  if (accounts.some((existing) => existing.id === account.id)) return;
  persist([...accounts, account]);
}

export function removeAccount(id: string): void {
  persist(accounts.filter((account) => account.id !== id));
}

/** Subscribe for React (useSyncExternalStore). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

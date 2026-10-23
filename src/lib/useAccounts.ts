import { useSyncExternalStore } from 'react';
import { listAccounts, subscribe, type RegisteredAccount } from './registry';

/** React view over the localStorage-backed account registry. */
export function useAccounts(): RegisteredAccount[] {
  return useSyncExternalStore(subscribe, listAccounts);
}

import type {
  Account,
  Balance,
  Entry,
  OpenAccountInput,
  Page,
  Problem,
  TransferInput,
} from './types';

/** Any non-2xx from the API, carrying the full RFC 9457 problem document. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail);
    this.name = 'ApiError';
    this.problem = problem;
    this.status = problem.status;
  }

  /** Machine-readable error code (e.g. "INSUFFICIENT_FUNDS", "RATE_LIMITED"). */
  get title(): string {
    return this.problem.title;
  }

  /** Seconds to wait before retrying, when the API said so (429). */
  get retryAfter(): number | undefined {
    return this.problem.retryAfter;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Decode a response into T, or throw the API's problem document. */
async function decode<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/problem+json')) {
      throw new ApiError((await response.json()) as Problem);
    }
    // Proxy or network layer broke the contract; surface it honestly instead
    // of pretending it was a domain error.
    throw new ApiError({
      type: 'about:blank',
      title: 'UNEXPECTED_RESPONSE',
      status: response.status,
      detail: `API returned ${response.status} without a problem document`,
    });
  }
  return (await response.json()) as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  return decode<T>(await fetch(path, { ...init, headers }));
}

export const api = {
  health(): Promise<{ status: string }> {
    return request('/healthz');
  },

  openAccount(input: OpenAccountInput): Promise<Account> {
    return request('/v1/accounts', { method: 'POST', body: JSON.stringify(input) });
  },

  getAccount(id: string): Promise<Account> {
    return request(`/v1/accounts/${encodeURIComponent(id)}`);
  },

  getBalance(id: string): Promise<Balance> {
    return request(`/v1/accounts/${encodeURIComponent(id)}/balance`);
  },

  listEntries(id: string, options: { limit: number; cursor?: string }): Promise<Page<Entry>> {
    const params = new URLSearchParams({ limit: String(options.limit) });
    if (options.cursor) params.set('cursor', options.cursor);
    return request(`/v1/accounts/${encodeURIComponent(id)}/entries?${params.toString()}`);
  },

  /**
   * The Idempotency-Key is REQUIRED by the API and makes retries safe: the
   * caller owns the key (generated once per user intent, reused on retry) so
   * a double-click or network replay returns the same entry with
   * `replayed: true` instead of moving money twice.
   */
  async transfer(
    input: TransferInput,
    idempotencyKey: string,
  ): Promise<{ entry: Entry; replayed: boolean }> {
    const response = await fetch('/v1/transfers', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(input),
    });
    const entry = await decode<Entry>(response);
    // 201 = new entry, 200 + header = replay of the same key.
    const replayed = response.headers.get('idempotency-replayed') === 'true';
    return { entry, replayed };
  },
};

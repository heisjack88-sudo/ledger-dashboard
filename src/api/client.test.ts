import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './client';
import type { Entry } from './types';

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function problemResponse(status: number, problem: Record<string, unknown>) {
  return new Response(JSON.stringify(problem), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

const entryFixture: Entry = {
  id: '97db6ac0-03aa-4ff0-bacc-64e8d3c2a284',
  kind: 'transfer',
  status: 'posted',
  correlationId: null,
  createdAt: '2026-10-23T17:00:00.000Z',
  postings: [],
};

const transferInput = {
  fromAccountId: '11111111-1111-1111-1111-111111111111',
  toAccountId: '22222222-2222-2222-2222-222222222222',
  amount: '5.25',
  currency: 'USD',
};

describe('ApiError decoding', () => {
  it('parses RFC 9457 problem+json into ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        problemResponse(422, {
          type: 'https://ledger-core.dev/problems/insufficient_funds',
          title: 'INSUFFICIENT_FUNDS',
          status: 422,
          detail: 'insufficient funds',
        }),
      ),
    );

    const error = await api.transfer(transferInput, 'key-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).title).toBe('INSUFFICIENT_FUNDS');
    expect((error as ApiError).message).toBe('insufficient funds');
  });

  it('exposes retryAfter from a 429 problem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        problemResponse(429, {
          type: 'https://ledger-core.dev/problems/rate-limited',
          title: 'RATE_LIMITED',
          status: 429,
          detail: 'Too many requests. Retry after 41s.',
          retryAfter: 41,
        }),
      ),
    );

    const error = (await api.getBalance('any').catch((e: unknown) => e)) as ApiError;

    expect(error.retryAfter).toBe(41);
  });

  it('reports non-problem responses honestly instead of faking a domain error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>gateway timeout</html>', {
          status: 502,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    );

    const error = (await api.getAccount('any').catch((e: unknown) => e)) as ApiError;

    expect(error.title).toBe('UNEXPECTED_RESPONSE');
    expect(error.status).toBe(502);
  });
});

describe('transfer idempotency', () => {
  it('sends the Idempotency-Key header and flags replays from the response header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(entryFixture, 200, { 'idempotency-replayed': 'true' }),
      ),
    );

    const result = await api.transfer(transferInput, 'intent-key-42');

    expect(result.replayed).toBe(true);
    expect(result.entry.id).toBe(entryFixture.id);

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('/v1/transfers');
    expect(new Headers(init?.headers).get('idempotency-key')).toBe('intent-key-42');
  });

  it('treats a 201 without the header as a fresh posting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(entryFixture, 201)),
    );

    const result = await api.transfer(transferInput, 'fresh-key');

    expect(result.replayed).toBe(false);
  });
});

describe('listEntries', () => {
  it('passes limit and cursor as query params', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [], nextCursor: null })));

    await api.listEntries('abc', { limit: 20, cursor: 'opaque-cursor' });

    const [url] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('/v1/accounts/abc/entries?limit=20&cursor=opaque-cursor');
  });
});

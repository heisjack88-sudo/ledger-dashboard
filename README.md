# Ledger Dashboard

[![CI](https://github.com/heisjack88-sudo/ledger-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/heisjack88-sudo/ledger-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

React dashboard for **[ledger-core](https://github.com/heisjack88-sudo/ledger-core)**, a double-entry ledger API with DB-enforced invariants. This app is the full-stack half of the portfolio: every number you see is computed server-side by the ledger — the UI never does the math.

## Features

- **Dashboard** — live per-account balances and per-currency totals (amounts are never summed across currencies).
- **Accounts** — open accounts through the API, or remember existing ones by UUID; balances always read live from the ledger.
- **Transfers** — posts real double-entry transfers, with the idempotency behavior made visible:
  - one `Idempotency-Key` per *user intent*: reused while the payload is unchanged (double-click / retry safe), rotated when the payload changes, cleared on success;
  - a replayed transfer is labeled *"Replayed — no double charge"* instead of silently pretending to be new;
  - client-side pre-flight for same-account and cross-currency transfers, server remains the authority (`422`).
- **Activity** — cursor-paginated journal entries straight from the API (no offset paging), debits in red, credits in green.
- **Honest errors** — every non-2xx is decoded as an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `problem+json` document (`INSUFFICIENT_FUNDS`, `RATE_LIMITED` with its `retryAfter`, field-level Zod `issues`).
- **API health** indicator in the sidebar (30s poll of `/healthz`).

## Stack

React 19 · TypeScript 6 · Vite 8 · Tailwind CSS 4 · TanStack Query 5 · React Router 7 · Vitest 5 + Testing Library

## Quick start

Requires a running [ledger-core](https://github.com/heisjack88-sudo/ledger-core) API.

```bash
npm install
npm run dev
```

The dev server proxies `/v1` and `/healthz` to `http://localhost:3100` — **same-origin, so no CORS changes are needed on the API**. Point elsewhere with:

```bash
VITE_API_TARGET=https://your-api.example.com npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with API proxy |
| `npm test` | Vitest (17 tests: API client, money formatting, app shell) |
| `npm run lint` | oxlint |
| `npm run build` | Type-check (`tsc -b`) + production bundle |

## Design notes

- **Money is strings.** Amounts cross the wire as decimal / minor-unit strings and are formatted with `BigInt` — the same no-floats rule the ledger enforces; a test proves values beyond `Number.MAX_SAFE_INTEGER` format without precision loss.
- **Account registry lives in `localStorage`.** ledger-core intentionally exposes no list endpoint; the dashboard remembers accounts it created or you pasted (validated against the API first). Balances remain server truth.
- **No silent retries on 4xx.** Deterministic API problems are not retried (they would only burn rate-limit budget); transient network faults retry twice.
- **Rate-limit aware.** The API allows 300 req/min globally and 60/min on writes; the UI surfaces `429 RATE_LIMITED` with the server's retry hint instead of failing opaquely.

## Related

- [ledger-core](https://github.com/heisjack88-sudo/ledger-core) — the API: double-entry posting, idempotent transfers, cursor pagination, security hardening (helmet, rate limiting, fail-closed config, `statement_timeout`).

## License

[MIT](LICENSE) © Fernando Guzman

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The dashboard talks same-origin (/v1, /healthz) and Vite forwards to the
// ledger-core API in dev — no CORS needed client-side. Override for staging:
//   VITE_API_TARGET=https://... npm run dev
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3100';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Fail loudly if 5173 is taken instead of silently moving ports —
    // a dashboard opened against a stale instance looks broken.
    strictPort: true,
    proxy: {
      '/v1': { target: apiTarget, changeOrigin: true },
      '/healthz': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    // One worker for every file: spawning several node workers fails with
    // errno -4094 on constrained Windows boxes (verified locally), and these
    // suites are small enough that parallelism buys nothing.
    maxWorkers: 1,
  },
});

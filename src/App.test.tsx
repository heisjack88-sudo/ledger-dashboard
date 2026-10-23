import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App shell', () => {
  it('renders the dashboard with nav, health and empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    renderApp();

    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Transfers' })).toBeTruthy();
    expect(await screen.findByText('No accounts yet')).toBeTruthy();
    expect(await screen.findByText('API online')).toBeTruthy();
  });

  it('routes unknown paths to the dashboard', () => {
    renderApp('/definitely-not-a-route');

    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeTruthy();
  });
});

import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/accounts', label: 'Accounts' },
  { to: '/transfers', label: 'Transfers' },
  { to: '/activity', label: 'Activity' },
];

function ApiHealth() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: 1,
  });

  const online = health.data?.status === 'ok';
  const label = health.isFetching && health.data === undefined ? 'Checking…' : online ? 'API online' : 'API offline';
  const tone =
    health.isFetching && health.data === undefined
      ? 'bg-amber-400 animate-pulse'
      : online
        ? 'bg-emerald-500'
        : 'bg-rose-500';

  return (
    <span
      className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500"
      title={label}
      aria-label={label}
    >
      <span className={'size-2 rounded-full ' + tone} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

/**
 * Single top bar instead of a fixed sidebar: works from phone widths up,
 * nav scrolls horizontally when it cannot fit, chrome stays minimal.
 */
export default function Layout() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Ledger Dashboard home"
          >
            <span className="grid size-7 place-items-center rounded-md bg-emerald-600 text-sm font-bold text-white">
              L
            </span>
            <span className="hidden text-sm font-semibold text-slate-900 sm:block">
              Ledger
            </span>
          </NavLink>

          <nav
            className="-mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1"
            aria-label="Main"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <ApiHealth />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

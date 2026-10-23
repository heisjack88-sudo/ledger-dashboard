import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const ICONS: Record<string, string> = {
  dashboard: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  accounts: 'M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5zM16 12h4',
  transfers: 'M4 8h13m0 0-3.5-3.5M17 8l-3.5 3.5M20 16H7m0 0 3.5-3.5M7 16l3.5 3.5',
  activity: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' as const, end: true },
  { to: '/accounts', label: 'Accounts', icon: 'accounts' as const },
  { to: '/transfers', label: 'Transfers', icon: 'transfers' as const },
  { to: '/activity', label: 'Activity', icon: 'activity' as const },
];

function ApiHealth() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: 1,
  });

  const online = health.data?.status === 'ok';
  const checking = health.isFetching && health.data === undefined;

  return (
    <span className="flex items-center gap-2 text-xs text-slate-500">
      <span
        className={
          'size-2 rounded-full ' +
          (checking
            ? 'bg-amber-400 animate-pulse'
            : online
              ? 'bg-emerald-500'
              : 'bg-rose-500')
        }
        aria-hidden="true"
      />
      {checking ? 'Checking API…' : online ? 'API online' : 'API offline'}
    </span>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-dvh">
      <aside className="fixed inset-y-0 left-0 flex w-56 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 font-bold text-white">
            L
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">Ledger</span>
            <span className="block text-xs text-slate-500">Dashboard</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <ApiHealth />
          <p className="mt-2 text-xs text-slate-400">
            Double-entry ledger · ledger-core API
          </p>
        </div>
      </aside>

      <div className="flex-1 pl-56">
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

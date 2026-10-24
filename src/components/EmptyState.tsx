import type { ReactNode } from 'react';

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center gap-3">{action}</div>}
    </div>
  );
}

import { ApiError } from '../api/client';

/**
 * Renders an RFC 9457 problem document as a user-facing alert:
 * status badge, human detail, field-level issues, and the 429 retry hint.
 */
export default function ProblemBanner({ error }: { error: unknown }) {
  if (!error) return null;

  if (error instanceof ApiError) {
    const statusTone =
      error.status >= 500
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : error.status === 429
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-rose-200 bg-rose-50 text-rose-700';

    return (
      <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${statusTone}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold">{error.title}</span>
          <span className="text-xs opacity-70">HTTP {error.status}</span>
        </div>
        <p className="mt-1">{error.message}</p>

        {error.retryAfter !== undefined && (
          <p className="mt-1 text-xs">
            Rate limited — try again in {error.retryAfter}s.
          </p>
        )}

        {Array.isArray(error.problem.issues) && error.problem.issues.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-xs">
            {error.problem.issues.map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                <span className="font-mono">{issue.path}</span>: {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      Unexpected error: {error instanceof Error ? error.message : String(error)}
    </div>
  );
}

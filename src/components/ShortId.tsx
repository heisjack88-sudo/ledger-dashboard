import { useState } from 'react';

/** Truncated monospace identifier with click-to-copy (full id in title). */
export default function ShortId({ id, length = 8 }: { id: string; length?: number }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked (permissions/private mode) — the title attr still
      // exposes the full id for manual copy.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={id}
      className="cursor-copy font-mono text-xs text-slate-500 hover:text-slate-800"
    >
      {copied ? 'copied!' : `${id.slice(0, length)}…`}
    </button>
  );
}

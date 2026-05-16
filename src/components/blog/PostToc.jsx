import React, { useState } from 'react';
import { ChevronDown, List } from 'lucide-react';

// Table of contents for long posts. Only mounted when the post has ≥3 H2s —
// shorter posts don't benefit and a 1-2 entry TOC is just visual noise. Mobile
// shows a collapsible accordion; desktop shows the full list inline (sticky
// positioning is handled by the parent grid in BlogPost so the TOC follows
// the reader on long scrolls).
export default function PostToc({ items, language = 'en', className = '' }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length < 3) return null;

  const label = language === 'en' ? 'On this page' : 'En esta página';

  return (
    <nav
      aria-label={label}
      className={`not-prose rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 ${className}`}
    >
      {/* Mobile: collapsible header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 lg:hidden"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          <List className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Desktop: always shown */}
      <div className="hidden items-center gap-2 lg:flex">
        <List className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          {label}
        </span>
      </div>

      <ol className={`mt-2 space-y-1.5 text-sm ${open ? 'block' : 'hidden'} lg:block`}>
        {items.map((item, i) => (
          <li key={`${item.id}-${i}`} className="leading-snug">
            <a
              href={`#${item.id}`}
              className="text-slate-600 transition-colors hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

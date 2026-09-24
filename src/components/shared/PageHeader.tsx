import * as React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  /** Small uppercase context line above the title, e.g. the desk or module name. */
  eyebrow?: string;
  /** Short accent marker rendered beside the eyebrow, e.g. a regime or status. */
  accentNote?: React.ReactNode;
  title: string;
  /** Sits inline after the title, for an info affordance or a live counter. */
  titleAdornment?: React.ReactNode;
  /** Support copy. Passing a node renders a status line instead of a sentence. */
  description?: React.ReactNode;
  /** Primary controls. Pushed to the trailing edge on wide viewports. */
  actions?: React.ReactNode;
  /** Full-width row below the title, for navigation strips or filter bars. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The single page-header grammar for workspace views. Mirrors the landing page's
 * section rhythm (eyebrow -> display title -> support copy -> hairline) so every
 * route opens the same way, while staying compact enough for desk work.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  accentNote,
  title,
  titleAdornment,
  description,
  actions,
  children,
  className,
}) => (
  <header className={cn('pb-3', className)}>
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {(eyebrow || accentNote) && (
          <div className="flex items-center gap-2 flex-wrap">
            {eyebrow && (
              <span className="metadata-label text-[10px] text-[var(--text-muted)]">{eyebrow}</span>
            )}
            {eyebrow && accentNote && <span className="text-[var(--border-strong)]">·</span>}
            {accentNote && (
              <span className="metadata-label text-[10px] text-[var(--accent)]">{accentNote}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5 flex-wrap mt-1.5">
          <h1 className="headline-h2 text-[var(--text-primary)]">{title}</h1>
          {titleAdornment}
        </div>

        {description && (
          <div className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {description}
          </div>
        )}

        {children && <div className="mt-3">{children}</div>}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>

    <div className="mt-3.5 border-t border-[var(--border-hairline)]" />
  </header>
);

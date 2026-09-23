import * as React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  /** Small uppercase context line above the title, e.g. the desk or module name. */
  eyebrow?: string;
  /** Short accent marker rendered beside the eyebrow, e.g. a regime or status. */
  accentNote?: string;
  title: string;
  description?: string;
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

        <h1 className="headline-h2 mt-1.5 text-[var(--text-primary)]">{title}</h1>

        {description && (
          <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        )}

        {children && <div className="mt-3">{children}</div>}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>

    <div className="mt-3.5 border-t border-[var(--border-hairline)]" />
  </header>
);

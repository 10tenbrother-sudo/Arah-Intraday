import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--accent)] text-[var(--text-primary)] font-bold',
        secondary:
          'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]',
        destructive:
          'border-[var(--bearish-border)] bg-[var(--bearish-bg)] text-[var(--bearish)]',
        rose:
          'border-[var(--bearish-border)] bg-[var(--bearish-bg)] text-[var(--bearish)]',
        outline:
          'border-[var(--border-subtle)] text-[var(--text-secondary)]',
        cyan:
          'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]',
        emerald:
          'border-[var(--bullish-border)] bg-[var(--bullish-bg)] text-[var(--bullish)]',
        amber:
          'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

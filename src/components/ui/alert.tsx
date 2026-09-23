import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-3.5 text-xs [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-[var(--text-primary)] [&>svg~*]:pl-7 font-sans',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)]',
        destructive:
          'border-[var(--bearish-border)] bg-[var(--bearish-bg)] text-[var(--bearish)] [&>svg]:text-[var(--bearish)]',
        warning:
          'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)] [&>svg]:text-[var(--warning)]',
        success:
          'border-[var(--bullish-border)] bg-[var(--bullish-bg)] text-[var(--bullish)] [&>svg]:text-[var(--bullish)]',
        info:
          'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] [&>svg]:text-[var(--accent)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight font-mono text-xs', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs [&_p]:leading-relaxed text-[var(--text-secondary)]', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };

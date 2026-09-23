import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-mono font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent)] text-white font-bold hover:opacity-90 shadow-[var(--shadow-raised)] active:translate-y-px',
        destructive:
          'bg-[var(--bearish-bg)] text-[var(--bearish)] border border-[var(--bearish-border)] hover:bg-[var(--bearish-bg)] active:translate-y-px',
        outline:
          'border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-section-alt)] text-[var(--text-primary)] hover:text-white',
        secondary:
          'bg-[var(--bg-section-alt)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] border border-[var(--border-strong)] active:translate-y-px',
        ghost:
          'hover:bg-[var(--bg-section-alt)] text-[var(--text-secondary)] hover:text-white',
        link:
          'text-[var(--accent)] underline-offset-4 hover:underline',
        subtle:
          'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent-subtle)]',
      },
      size: {
        default: 'h-8 px-3.5 py-1.5',
        sm: 'h-7 rounded-md px-2.5 text-[11px]',
        lg: 'h-10 rounded-md px-6 text-sm font-semibold',
        icon: 'h-8 w-8 p-0',
        xs: 'h-6 px-2 text-[10px] rounded',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

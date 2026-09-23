import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-cyan-500 text-slate-950 font-bold',
        secondary:
          'border-slate-800 bg-slate-900 text-slate-300',
        destructive:
          'border-rose-800 bg-rose-950/80 text-rose-300',
        rose:
          'border-rose-800 bg-rose-950/80 text-rose-300',
        outline:
          'border-slate-800 text-slate-300',
        cyan:
          'border-cyan-800/80 bg-cyan-950/60 text-cyan-300',
        emerald:
          'border-emerald-800/80 bg-emerald-950/60 text-emerald-300',
        amber:
          'border-amber-800/80 bg-amber-950/60 text-amber-300',
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

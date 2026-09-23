import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-mono font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 shadow-sm shadow-cyan-950/40 active:translate-y-px',
        destructive:
          'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 active:translate-y-px',
        outline:
          'border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 hover:text-white',
        secondary:
          'bg-slate-800 text-slate-200 hover:bg-slate-750 border border-slate-700 active:translate-y-px',
        ghost:
          'hover:bg-slate-800/60 text-slate-300 hover:text-white',
        link:
          'text-cyan-400 underline-offset-4 hover:underline',
        subtle:
          'bg-cyan-950/50 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/50',
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

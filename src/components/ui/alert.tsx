import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-3.5 text-xs [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-neutral-100 [&>svg~*]:pl-7 font-sans',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900/90 text-neutral-200 border-neutral-800',
        destructive:
          'border-rose-900/50 bg-rose-950/40 text-rose-300 [&>svg]:text-rose-400',
        warning:
          'border-amber-900/50 bg-amber-950/40 text-amber-300 [&>svg]:text-amber-400',
        success:
          'border-emerald-900/50 bg-emerald-950/40 text-emerald-300 [&>svg]:text-emerald-400',
        info:
          'border-cyan-900/50 bg-cyan-950/40 text-cyan-300 [&>svg]:text-cyan-400',
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
    className={cn('text-xs [&_p]:leading-relaxed text-neutral-400', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[var(--bg-canvas)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border-[var(--border-subtle)] group-[.toaster]:shadow-lg font-mono text-xs',
          description: 'group-[.toast]:text-[var(--text-secondary)] font-sans',
          actionButton:
            'group-[.toast]:bg-[var(--accent)] group-[.toast]:text-[var(--text-primary)] font-bold',
          cancelButton:
            'group-[.toast]:bg-[var(--bg-section-alt)] group-[.toast]:text-[var(--text-secondary)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

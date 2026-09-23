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
            'group toast group-[.toaster]:bg-neutral-950 group-[.toaster]:text-neutral-100 group-[.toaster]:border-neutral-800 group-[.toaster]:shadow-lg font-mono text-xs',
          description: 'group-[.toast]:text-neutral-400 font-sans',
          actionButton:
            'group-[.toast]:bg-cyan-500 group-[.toast]:text-neutral-950 font-bold',
          cancelButton:
            'group-[.toast]:bg-neutral-800 group-[.toast]:text-neutral-400',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

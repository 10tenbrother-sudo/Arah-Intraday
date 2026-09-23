import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Gagal Memuat Data',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-[var(--radius-md)] border border-[var(--bearish-border)] bg-[var(--bearish-bg)] my-3',
        className
      )}
    >
      <div className="h-10 w-10 rounded-[var(--radius-sm)] bg-[var(--bearish-bg)] border border-[var(--bearish-border)] flex items-center justify-center text-[var(--bearish)] mb-3 shadow-inner">
        <AlertTriangle className="w-5 h-5 text-[var(--bearish)]" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--bearish)] font-mono tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[var(--bearish)] max-w-sm mt-1 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-4 font-mono text-xs border-[var(--bearish-border)] hover:bg-[var(--bearish-bg)] text-[var(--bearish)]"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

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
        'flex flex-col items-center justify-center p-6 text-center rounded-xl border border-rose-900/40 bg-rose-950/20 my-3',
        className
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
        <AlertTriangle className="w-5 h-5 text-rose-400" />
      </div>
      <h3 className="text-sm font-semibold text-rose-200 font-mono tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-rose-300/80 max-w-sm mt-1 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-4 font-mono text-xs border-rose-800/80 hover:bg-rose-950/60 text-rose-200"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingStateProps {
  variant?: 'spinner' | 'cards' | 'list' | 'inline';
  count?: number;
  message?: string;
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]',
        className
      )}
    />
  );
}

export function LoadingState({
  variant = 'spinner',
  count = 3,
  message,
  className,
}: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className={cn('space-y-3', className)}>
        {message && (
          <LoadingMessage message={message} />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {message && (
          <LoadingMessage message={message} />
        )}
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonBlock key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]', className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
        {message || 'Memuat...'}
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-10 text-center', className)}>
      <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] mb-3" />
      <p className="text-xs font-mono text-[var(--text-secondary)]">
        {message || 'Memuat data...'}
      </p>
    </div>
  );
}

function LoadingMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
      {message}
    </div>
  );
}

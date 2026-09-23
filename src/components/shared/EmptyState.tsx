import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderSearch,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const finalActionLabel = action?.label || actionLabel;
  const finalOnAction = action?.onClick || onAction;

  const renderIcon = () => {
    if (!Icon) return null;
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    const IconComp = Icon as LucideIcon;
    return <IconComp className="w-5 h-5 text-neutral-400" />;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-neutral-800 bg-neutral-900/40 my-3',
        className
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-neutral-850 border border-neutral-750 flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
        {renderIcon()}
      </div>
      <h3 className="text-sm font-semibold text-neutral-200 font-mono tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-neutral-400 max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {finalActionLabel && finalOnAction && (
        <Button
          onClick={finalOnAction}
          variant="outline"
          size="sm"
          className="mt-4 font-mono text-xs"
        >
          {finalActionLabel}
        </Button>
      )}
    </div>
  );
}

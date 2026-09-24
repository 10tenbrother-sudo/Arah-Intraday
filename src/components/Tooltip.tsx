import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { MARKET_GLOSSARY, GlossaryItem } from '../lib/marketGlossary';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  title?: string;
  badge?: string;
  badgeColor?: string;
  whyItMatters?: string;
  formula?: string;
  position?: TooltipPosition;
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  title,
  badge,
  badgeColor = 'text-[var(--accent)] bg-[var(--accent-subtle)] border-[var(--accent)]',
  whyItMatters,
  formula,
  position = 'top',
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    // For touch devices
    e.stopPropagation();
    setIsVisible(prev => !prev);
  };

  // Close on outside click for touch devices
  useEffect(() => {
    if (!isVisible) return;
    const handleDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [isVisible]);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const isBlock = className.includes('w-full') || className.includes('block') || className.includes('flex-col');
  const baseClasses = isBlock ? 'relative block w-full min-w-0' : 'relative inline-flex items-center';

  return (
    <div
      ref={containerRef}
      className={`${baseClasses} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${getPositionClasses()} z-50 w-72 max-w-[85vw] p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--accent)] shadow-[var(--shadow-overlay)] backdrop-blur-md text-left text-xs font-mono pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header Row */}
          {(title || badge) && (
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5 mb-2">
              {title && (
                <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)] text-xs truncate">
                  <BookOpen className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <span className="truncate">{title}</span>
                </div>
              )}
              {badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase tracking-wider shrink-0 ${badgeColor}`}>
                  {badge}
                </span>
              )}
            </div>
          )}

          {/* Definition Body */}
          <div className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
            {content}
          </div>

          {/* Formula or Interpretation */}
          {formula && (
            <div className="mt-2 p-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)]">
              <span className="text-[var(--accent)] font-semibold block mb-0.5">Rumus / Interpretasi:</span>
              <span className="text-[var(--text-secondary)]">{formula}</span>
            </div>
          )}

          {/* Why It Matters */}
          {whyItMatters && (
            <div className="mt-2 pt-1.5 border-t border-[var(--border-subtle)] text-[10px] text-[var(--warning)] flex items-start gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--warning)] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[var(--warning)]">Pentingnya:</strong> {whyItMatters}
              </span>
            </div>
          )}

          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-[var(--bg-surface)] border-[var(--accent)] rotate-45 ${
              position === 'bottom'
                ? '-top-1 left-1/2 -translate-x-1/2 border-t border-l'
                : position === 'left'
                ? '-right-1 top-1/2 -translate-y-1/2 border-t border-r'
                : position === 'right'
                ? '-left-1 top-1/2 -translate-y-1/2 border-b border-l'
                : '-bottom-1 left-1/2 -translate-x-1/2 border-b border-r'
            }`}
          />
        </div>
      )}
    </div>
  );
};

interface MetricTooltipProps {
  term: keyof typeof MARKET_GLOSSARY | string;
  children?: React.ReactNode;
  showIcon?: boolean;
  underline?: boolean;
  position?: TooltipPosition;
  customText?: string;
  className?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  term,
  children,
  showIcon = false,
  underline = true,
  position = 'top',
  customText,
  className = '',
}) => {
  const glossaryItem: GlossaryItem | undefined = MARKET_GLOSSARY[term.toUpperCase()];

  const title = glossaryItem?.term || term;
  const content = customText || glossaryItem?.definition || 'A measurable market term or metric.';
  const badge = glossaryItem?.category || 'METRIC';
  const formula = glossaryItem?.formulaOrInterpretation;
  const whyItMatters = glossaryItem?.whyItMatters;

  const displayText = children || glossaryItem?.shortLabel || term;

  return (
    <Tooltip
      title={title}
      content={content}
      badge={badge}
      formula={formula}
      whyItMatters={whyItMatters}
      position={position}
      className={className}
    >
      <span
        className={`inline-flex items-center gap-1 cursor-help transition-colors ${
          underline
            ? 'border-b border-dotted border-[var(--border-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            : ''
        }`}
      >
        <span>{displayText}</span>
        {showIcon && <HelpCircle className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--accent)]" />}
      </span>
    </Tooltip>
  );
};

interface MetricInfoIconProps {
  term: keyof typeof MARKET_GLOSSARY | string;
  position?: TooltipPosition;
  className?: string;
  iconClassName?: string;
}

export const MetricInfoIcon: React.FC<MetricInfoIconProps> = ({
  term,
  position = 'top',
  className = '',
  iconClassName = 'w-3 h-3 text-[var(--text-muted)] hover:text-[var(--accent)]',
}) => {
  const glossaryItem: GlossaryItem | undefined = MARKET_GLOSSARY[term.toUpperCase()];

  const title = glossaryItem?.term || term;
  const content = glossaryItem?.definition || 'Explanation of a market metric.';
  const badge = glossaryItem?.category || 'METRIC';
  const formula = glossaryItem?.formulaOrInterpretation;
  const whyItMatters = glossaryItem?.whyItMatters;

  return (
    <Tooltip
      title={title}
      content={content}
      badge={badge}
      formula={formula}
      whyItMatters={whyItMatters}
      position={position}
      className={className}
    >
      <button
        type="button"
        aria-label={`Info ${term}`}
        className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-section-alt)] transition cursor-help flex items-center justify-center"
      >
        <HelpCircle className={iconClassName} />
      </button>
    </Tooltip>
  );
};

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  X,
  BarChart2,
  ChevronRight,
  Send,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { MarketEvent } from '../types';

export interface TriggeredNewsAlert {
  id: string;
  event: MarketEvent;
  newsTitle?: string;
  newsContent?: string;
  sourceName?: string;
  sourceUrl?: string;
  triggeredAt: Date;
}

interface BreakingNewsAlertPopupProps {
  alerts: TriggeredNewsAlert[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onOpenEventDetail: (event: MarketEvent) => void;
  onOpenChart?: (symbol: string) => void;
  onOpenTriggerModal?: () => void;
}

export const BreakingNewsAlertPopup: React.FC<BreakingNewsAlertPopupProps> = ({
  alerts,
  onDismiss,
  onOpenEventDetail,
  onOpenChart,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Strictly 1 news = 1 popup (only the newest alert is displayed)
  const activeAlert = alerts[0] || null;

  // Auto-dismiss timer (7 seconds), paused on hover
  useEffect(() => {
    if (!activeAlert || isHovered) return;

    const timer = setTimeout(() => {
      onDismiss(activeAlert.id);
    }, 7000);

    return () => clearTimeout(timer);
  }, [activeAlert?.id, isHovered, onDismiss]);

  if (!activeAlert) return null;

  const { event, sourceName } = activeAlert;
  const isCritical = event.impact_level === 'CRITICAL';
  const isHigh = event.impact_level === 'HIGH';

  const primaryAsset = event.affected_assets?.[0] || event.affected_currencies?.[0] || null;

  return (
    <aside
      aria-label="Pemberitahuan Berita Terkini"
      className="fixed bottom-4 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 pointer-events-auto"
      id="breaking-news-alert-popup"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        key={activeAlert.id}
        initial={{ opacity: 0, y: 15, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: 'spring', damping: 24, stiffness: 350 }}
        className={`relative overflow-hidden rounded-lg border shadow-[var(--shadow-overlay)] backdrop-blur-md text-[var(--text-primary)] ${
          isCritical
            ? 'bg-[var(--bg-canvas)] border-[var(--bearish-border)] shadow-[var(--shadow-raised)] ring-1 ring-[var(--bearish-border)]'
            : isHigh
            ? 'bg-[var(--bg-canvas)] border-[var(--warning-border)] shadow-[var(--shadow-raised)] ring-1 ring-[var(--warning-border)]'
            : 'bg-[var(--bg-canvas)] border-[var(--accent)] shadow-[var(--shadow-raised)] ring-1 ring-[var(--accent)]'
        }`}
      >
        {/* Compact Header Bar */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[10px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCritical ? 'bg-[var(--bearish)]' : isHigh ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isCritical ? 'bg-[var(--bearish)]' : isHigh ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'
                }`}
              />
            </span>
            <span
              className={`px-1 py-0.2 rounded text-[9px] font-bold tracking-wider shrink-0 ${
                isCritical
                  ? 'bg-[var(--bearish-bg)] text-[var(--bearish)] border border-[var(--bearish-border)]'
                  : isHigh
                  ? 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]'
                  : 'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]'
              }`}
            >
              {event.impact_level || 'FLASH'}
            </span>
            <span className="truncate text-[var(--text-secondary)] text-[10px]">
              {sourceName || event.source_names?.[0] || 'Terminal Wire'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1.5">
            {activeAlert.sourceUrl && (
              <a
                href={activeAlert.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition p-0.5"
                title="Buka sumber asli"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={() => onDismiss(activeAlert.id)}
              className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section-alt)] transition cursor-pointer"
              title="Tutup Alert"
              id="close-alert-toast-btn"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Compact Body */}
        <div className="p-2.5 space-y-1.5">
          {/* Clickable Headline */}
          <h4
            onClick={() => {
              onOpenEventDetail(event);
              onDismiss(activeAlert.id);
            }}
            className="text-[11.5px] font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition leading-snug line-clamp-2 cursor-pointer"
            title="Klik untuk membuka analisis lengkap"
          >
            {event.title}
          </h4>

          {/* Footer: Asset Tags & Quick Action */}
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-[10px]">
            <div className="flex items-center gap-1 overflow-hidden">
              {event.affected_assets?.slice(0, 2).map((asset) => (
                <span
                  key={asset}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChart?.(asset);
                    onDismiss(activeAlert.id);
                  }}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--bg-surface)] text-[var(--accent)] border border-[var(--border-strong)] hover:border-[var(--accent)] cursor-pointer flex items-center gap-0.5 transition shrink-0"
                  title={`Chart ${asset}`}
                >
                  <span>{asset}</span>
                  <BarChart2 className="w-2.5 h-2.5 opacity-60" />
                </span>
              ))}
              {(!event.affected_assets || event.affected_assets.length === 0) &&
                event.affected_currencies?.slice(0, 2).map((curr) => (
                  <span
                    key={curr}
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0"
                  >
                    {curr}
                  </span>
                ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenEventDetail(event);
                onDismiss(activeAlert.id);
              }}
              className="text-[10px] font-semibold text-[var(--accent)] hover:text-[var(--accent)] flex items-center gap-0.5 transition cursor-pointer py-0.5 px-1 rounded hover:bg-[var(--accent-subtle)]"
              id="alert-view-detail-btn"
            >
              <span>Detail</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Slim Auto-Dismiss Countdown Bar */}
        <div className="h-0.5 w-full bg-[var(--bg-surface)] overflow-hidden">
          <motion.div
            key={activeAlert.id}
            initial={{ width: '100%' }}
            animate={{ width: isHovered ? undefined : '0%' }}
            transition={{ duration: 7, ease: 'linear' }}
            className={`h-full ${
              isCritical ? 'bg-[var(--bearish)]' : isHigh ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'
            }`}
          />
        </div>
      </motion.div>
    </aside>
  );
};

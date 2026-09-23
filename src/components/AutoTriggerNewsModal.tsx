import React, { useState, useEffect } from 'react';
import {
  Zap,
  Clock,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Radio,
  X,
  Send,
  Flame,
  Globe2,
  Coins,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sound';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

export interface AutoTriggerConfig {
  enabled: boolean;
  intervalSeconds: number;
  minImpact: 'ALL' | 'HIGH' | 'CRITICAL';
  soundEnabled: boolean;
  selectedCategory: string;
}

interface AutoTriggerNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AutoTriggerConfig;
  onUpdateConfig: (newConfig: Partial<AutoTriggerConfig>) => void;
  onTriggerNow: (preset?: {
    category?: string;
    title?: string;
    content?: string;
    affected_assets?: string[];
    affected_currencies?: string[];
  }) => Promise<void>;
  isTriggering: boolean;
  secondsRemaining: number;
  totalTriggeredCount: number;
}

const PRESET_TRIGGER_OPTIONS = [
  {
    id: 'live_telegram',
    title: 'Telegram Live Wire (Berita Asli Terkini)',
    desc: 'Pull live breaking messages from @financialjuice, @WatcherGuru, @SM_News_24h, @fxstreetforexindonesia',
    icon: Send,
    color: 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent)] hover:bg-[var(--accent)]',
  },
  {
    id: 'central_bank',
    title: 'Kebijakan Bank Sentral (Fed / RBA / BoJ)',
    desc: 'Rate decisions, hawkish/dovish stance, FX intervention',
    category: 'CENTRAL_BANK',
    icon: Building2,
    color: 'text-[var(--accent)] border-[var(--border-subtle)] bg-[var(--accent)] hover:bg-[var(--accent)]',
  },
  {
    id: 'audcad',
    title: 'AUD/CAD & Komoditas Cross Impact',
    desc: 'Divergensi RBA vs BoC dan momentum ekspor bahan mentah',
    category: 'CENTRAL_BANK',
    customTitle: 'RBA Pertahankan Sikap Hawkish di Tengah Moderasi Global; AUD/CAD Melonjak Signifikan',
    customContent: 'The Reserve Bank of Australia reaffirmed its tightening stance as domestic services inflation stays sticky, widening the yield divergence against the Bank of Canada.',
    affected_assets: ['AUDCAD', 'AUDUSD'],
    affected_currencies: ['AUD', 'CAD'],
    icon: Coins,
    color: 'text-[var(--bullish)] border-[var(--bullish-border)] bg-[var(--bullish)] hover:bg-[var(--bullish)]',
  },
  {
    id: 'us_macro',
    title: 'US Macro Flash (CPI / NFP / Yields)',
    desc: 'US Core CPI inflation surprises and US10Y bond yield moves',
    category: 'MACRO',
    customTitle: 'US Core CPI Prints Below Consensus; Dollar Index (DXY) Slides and Gold Jumps',
    customContent: 'Slowing US monthly core inflation lifted the probability of a Fed rate cut. Treasury yields corrected across the curve.',
    affected_assets: ['XAUUSD', 'EURUSD', 'USDJPY', 'US30'],
    affected_currencies: ['USD', 'EUR', 'JPY'],
    icon: Globe2,
    color: 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent)] hover:bg-[var(--accent)]',
  },
  {
    id: 'gold_commodities',
    title: 'Emas (XAU/USD) & Pasokan Minyak Mentah',
    desc: 'Safe-haven breakout emas dan perpanjangan kuota pemangkasan OPEC+',
    category: 'COMMODITIES',
    customTitle: 'Emas (XAUUSD) Sentuh Rekor Tertinggi Baru di Tengah Eskalasi Risiko Geopolitik',
    customContent: 'Pembelian agresif safe-haven dan akumulasi cadangan devisa oleh bank sentral global mendorong spot emas menembus resistance struktural utama.',
    affected_assets: ['XAUUSD', 'USDCAD'],
    affected_currencies: ['USD', 'CAD'],
    icon: Sparkles,
    color: 'text-[var(--warning)] border-[var(--warning-border)] bg-[var(--warning)] hover:bg-[var(--warning)]',
  },
];

export const AutoTriggerNewsModal: React.FC<AutoTriggerNewsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onTriggerNow,
  isTriggering,
  secondsRemaining,
  totalTriggeredCount,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customCategory, setCustomCategory] = useState('MACRO');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [soundTestSuccess, setSoundTestSuccess] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTestSound = () => {
    soundManager.playBreakingNewsChime();
    setSoundTestSuccess(true);
    setTimeout(() => setSoundTestSuccess(false), 1500);
  };

  const handleTriggerCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    await onTriggerNow({
      title: customTitle.trim(),
      content: customContent.trim() || customTitle.trim(),
      category: customCategory,
    });
    setCustomTitle('');
    setCustomContent('');
    setShowCustomForm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Dark backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[var(--bg-canvas)] backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-[var(--shadow-overlay)] shadow-[var(--shadow-overlay)] flex flex-col max-h-[90vh] overflow-hidden text-[var(--text-primary)] font-mono z-10"
        id="auto-trigger-news-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent)] text-[var(--accent)] border border-[var(--accent)]">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
                  TRIGER BERITA OTOMATIS
                </h2>
                <Badge
                  variant={config.enabled ? 'emerald' : 'secondary'}
                  className="text-[10px] font-mono font-bold"
                >
                  {config.enabled ? 'ACTIVE AUTO-STREAM' : 'STANDBY'}
                </Badge>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Fire breaking news on a schedule and show a real-time popup in the terminal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-section-alt)] transition cursor-pointer"
            id="close-trigger-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[var(--text-secondary)]">
          {/* Main Toggle Banner */}
          <div className="p-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--text-primary)] text-sm">
                  Aktifkan Auto-Trigger Berita Berkala
                </span>
                {config.enabled && (
                  <Badge variant="cyan" className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 animate-spin" />
                    Triger berikutnya: <strong className="text-white ml-0.5">{secondsRemaining}s</strong>
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                The app injects breaking news automatically and triggers the alert popup on each interval.
              </p>
            </div>

            <Button
              onClick={() => onUpdateConfig({ enabled: !config.enabled })}
              variant={config.enabled ? 'default' : 'secondary'}
              size="sm"
              className={config.enabled ? 'bg-[var(--bullish)] hover:bg-[var(--bullish)] text-white font-bold' : ''}
              id="toggle-auto-trigger-btn"
            >
              {config.enabled ? (
                <>
                  <Pause className="w-4 h-4 fill-current mr-1.5" />
                  <span>JEDA AUTO-TRIGGER</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current mr-1.5" />
                  <span>AKTIFKAN SEKARANG</span>
                </>
              )}
            </Button>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Interval Selection */}
            <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                Interval Frekuensi
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: '20s', val: 20 },
                  { label: '45s', val: 45 },
                  { label: '90s', val: 90 },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onUpdateConfig({ intervalSeconds: item.val })}
                    className={`py-1.5 px-2 rounded text-[11px] font-bold text-center border transition cursor-pointer ${
                      config.intervalSeconds === item.val
                        ? 'bg-[var(--accent)] text-[var(--accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-section-alt)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter */}
            <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--warning)]" />
                Filter Min. Dampak
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: 'SEMUA', val: 'ALL' as const },
                  { label: 'HIGH', val: 'HIGH' as const },
                  { label: 'CRITICAL', val: 'CRITICAL' as const },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onUpdateConfig({ minImpact: item.val })}
                    className={`py-1.5 px-1 rounded text-[10px] font-bold text-center border transition cursor-pointer ${
                      config.minImpact === item.val
                        ? 'bg-[var(--warning)] text-[var(--warning)] border-[var(--warning-border)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-section-alt)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Alert Chime */}
            <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5 flex flex-col justify-between">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {config.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-[var(--bullish)]" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )}
                  Suara Notifikasi
                </span>
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer flex items-center gap-1"
                  title="Test the Web Audio chime"
                >
                  {soundTestSuccess ? '✓ Terdengar' : 'Test chime'}
                </button>
              </label>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                  {config.soundEnabled ? '🔔 Audio on' : '🔕 Mute / Hening'}
                </span>
                <Switch
                  checked={config.soundEnabled}
                  onCheckedChange={(checked) => {
                    onUpdateConfig({ soundEnabled: checked });
                    soundManager.setMuted(!checked);
                    if (checked) soundManager.playBreakingNewsChime();
                  }}
                  aria-label="Toggle alert sound"
                />
              </div>
            </div>
          </div>

          {/* Manual / Instant Trigger Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--text-primary)] tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[var(--accent)]" />
                PILIH & TRIGER BERITA SEKARANG (INSTANT ACTION)
              </h3>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Total triggered: <strong className="text-[var(--accent)]">{totalTriggeredCount}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_TRIGGER_OPTIONS.map(preset => {
                const IconComponent = preset.icon;
                return (
                  <button
                    key={preset.id}
                    disabled={isTriggering}
                    onClick={() => onTriggerNow(preset.id === 'random' ? undefined : {
                      category: preset.category,
                      title: preset.customTitle,
                      content: preset.customContent,
                      affected_assets: preset.affected_assets,
                      affected_currencies: preset.affected_currencies,
                    })}
                    className={`p-3 rounded-lg border text-left transition flex items-start gap-2.5 cursor-pointer disabled:opacity-50 ${preset.color}`}
                  >
                    <div className="p-1.5 rounded-md bg-[var(--bg-canvas)] border border-current shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="font-bold text-xs text-[var(--text-primary)] flex items-center justify-between">
                        <span className="truncate">{preset.title}</span>
                        <Zap className="w-3 h-3 shrink-0 text-current" />
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom News Input Accordion */}
          <div className="border-t border-[var(--border-subtle)] pt-3">
            <button
              type="button"
              onClick={() => setShowCustomForm(prev => !prev)}
              className="text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent)] flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showCustomForm ? '▼ Sembunyikan Form Berita Custom' : '▶ Buat Berita Custom Manual Sendiri...'}</span>
            </button>

            <AnimatePresence>
              {showCustomForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleTriggerCustom}
                  className="mt-3 p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3"
                >
                  <div>
                    <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-semibold">
                      Judul / Headline Berita:
                    </label>
                    <input
                      type="text"
                      required
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      placeholder="e.g. RBA signals a faster pace of rate cuts..."
                      className="w-full px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--text-secondary)] mb-1 font-semibold">
                      Isi Ringkasan Berita (Opsional):
                    </label>
                    <textarea
                      rows={2}
                      value={customContent}
                      onChange={e => setCustomContent(e.target.value)}
                      placeholder="Describe the impact on AUD, CAD, or related commodities..."
                      className="w-full px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="MACRO">Kategori: Macro</option>
                      <option value="CENTRAL_BANK">Kategori: Central Bank</option>
                      <option value="COMMODITIES">Kategori: Commodities</option>
                      <option value="GEOPOLITICS">Kategori: Geopolitics</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isTriggering || !customTitle.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent)] disabled:opacity-50 text-white rounded font-bold text-xs cursor-pointer shadow-[var(--shadow-raised)]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send &amp; trigger popup</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--bullish)] animate-ping" />
            <span>Pipeline Real-Time SSE Terhubung</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-bold transition cursor-pointer"
            >
              Done &amp; close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

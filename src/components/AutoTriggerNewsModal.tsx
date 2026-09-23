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
    desc: 'Tarik langsung pesan breaking real-time dari @financialjuice, @WatcherGuru, @SM_News_24h, @fxstreetforexindonesia',
    icon: Send,
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20',
  },
  {
    id: 'central_bank',
    title: 'Kebijakan Bank Sentral (Fed / RBA / BoJ)',
    desc: 'Keputusan suku bunga, stance hawkish/dovish, intervensi valas',
    category: 'CENTRAL_BANK',
    icon: Building2,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20',
  },
  {
    id: 'audcad',
    title: 'AUD/CAD & Komoditas Cross Impact',
    desc: 'Divergensi RBA vs BoC dan momentum ekspor bahan mentah',
    category: 'CENTRAL_BANK',
    customTitle: 'RBA Pertahankan Sikap Hawkish di Tengah Moderasi Global; AUD/CAD Melonjak Signifikan',
    customContent: 'Reserve Bank of Australia menegaskan komitmen pengetatan moneter akibat kekakuan inflasi jasa domestik, memperlebar divergensi yield terhadap Bank of Canada.',
    affected_assets: ['AUDCAD', 'AUDUSD'],
    affected_currencies: ['AUD', 'CAD'],
    icon: Coins,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    id: 'us_macro',
    title: 'US Macro Flash (CPI / NFP / Imbal Hasil)',
    desc: 'Kejutan inflasi US Core CPI dan pergerakan yield obligasi US10Y',
    category: 'MACRO',
    customTitle: 'US Core CPI Rilis di Bawah Konsensus; US Dollar Index (DXY) Melemah dan Emas Naik Tajam',
    customContent: 'Data inflasi inti bulanan AS yang melambat memicu lonjakan probabilitas pemangkasan suku bunga Fed. Imbal hasil obligasi AS terkoreksi di seluruh kurva.',
    affected_assets: ['XAUUSD', 'EURUSD', 'USDJPY', 'US30'],
    affected_currencies: ['USD', 'EUR', 'JPY'],
    icon: Globe2,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20',
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
    color: 'text-amber-300 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20',
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
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[90vh] overflow-hidden text-slate-100 font-mono z-10"
        id="auto-trigger-news-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 tracking-wide">
                  TRIGER BERITA OTOMATIS
                </h2>
                <Badge
                  variant={config.enabled ? 'emerald' : 'secondary'}
                  className="text-[10px] font-mono font-bold"
                >
                  {config.enabled ? 'ACTIVE AUTO-STREAM' : 'STANDBY'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Picu berita breaking secara berkala & tampilkan popup real-time di terminal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            id="close-trigger-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Main Toggle Banner */}
          <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-sm">
                  Aktifkan Auto-Trigger Berita Berkala
                </span>
                {config.enabled && (
                  <Badge variant="cyan" className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 animate-spin" />
                    Triger berikutnya: <strong className="text-white ml-0.5">{secondsRemaining}s</strong>
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Aplikasi akan otomatis menyuntikkan breaking news & memicu popup notifikasi sesuai interval.
              </p>
            </div>

            <Button
              onClick={() => onUpdateConfig({ enabled: !config.enabled })}
              variant={config.enabled ? 'default' : 'secondary'}
              size="sm"
              className={config.enabled ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' : ''}
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
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
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
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
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
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Alert Chime */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5 flex flex-col justify-between">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {config.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  Suara Notifikasi
                </span>
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="text-[10px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                  title="Uji suara Web Audio chime"
                >
                  {soundTestSuccess ? '✓ Terdengar' : 'Uji Chime'}
                </button>
              </label>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-300">
                  {config.soundEnabled ? '🔔 Audio Aktif' : '🔕 Mute / Hening'}
                </span>
                <Switch
                  checked={config.soundEnabled}
                  onCheckedChange={(checked) => {
                    onUpdateConfig({ soundEnabled: checked });
                    soundManager.setMuted(!checked);
                    if (checked) soundManager.playBreakingNewsChime();
                  }}
                  aria-label="Toggle suara notifikasi"
                />
              </div>
            </div>
          </div>

          {/* Manual / Instant Trigger Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                PILIH & TRIGER BERITA SEKARANG (INSTANT ACTION)
              </h3>
              <span className="text-[11px] text-slate-400">
                Total Ter-Triger: <strong className="text-cyan-400">{totalTriggeredCount}</strong>
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
                    <div className="p-1.5 rounded-md bg-slate-950/80 border border-current shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-100 flex items-center justify-between">
                        <span className="truncate">{preset.title}</span>
                        <Zap className="w-3 h-3 shrink-0 text-current" />
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom News Input Accordion */}
          <div className="border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => setShowCustomForm(prev => !prev)}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer"
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
                  className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                      Judul / Headline Berita:
                    </label>
                    <input
                      type="text"
                      required
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      placeholder="Contoh: RBA Isyaratkan Pemotongan Suku Bunga Lebih Cepat..."
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">
                      Isi Ringkasan Berita (Opsional):
                    </label>
                    <textarea
                      rows={2}
                      value={customContent}
                      onChange={e => setCustomContent(e.target.value)}
                      placeholder="Uraian dampak terhadap AUD, CAD, atau komoditas terkait..."
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="MACRO">Kategori: Macro</option>
                      <option value="CENTRAL_BANK">Kategori: Central Bank</option>
                      <option value="COMMODITIES">Kategori: Commodities</option>
                      <option value="GEOPOLITICS">Kategori: Geopolitics</option>
                    </select>

                    <button
                      type="submit"
                      disabled={isTriggering || !customTitle.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-bold text-xs cursor-pointer shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim & Triger Popup</span>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Pipeline Real-Time SSE Terhubung</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

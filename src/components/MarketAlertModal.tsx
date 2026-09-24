import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Clock,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { api } from '../lib/api';
import { MarketAlertPublicConfig } from '../types';

interface MarketAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ALL_INSTRUMENTS = [
  'XAUUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'US100',
  'US30',
  'US500',
  'BTC',
];

export const MarketAlertModal: React.FC<MarketAlertModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<MarketAlertPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [enabled, setEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [cooldown, setCooldown] = useState(120);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(ALL_INSTRUMENTS);

  // Feedback states
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ count: number; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchConfig = async () => {
      setLoading(true);
      setTestResult(null);
      setScanResult(null);
      try {
        const res = await api.getAlertConfig();
        if (res.success && res.config) {
          setConfig(res.config);
          setEnabled(res.config.enabled);
          setChatId(res.config.telegramChatId || '');
          setWaPhone(res.config.whatsappPhone || '');
          setCooldown(res.config.cooldownMinutes || 120);
          setSelectedInstruments(res.config.instruments || ALL_INSTRUMENTS);
        }
      } catch (err: any) {
        console.warn('Failed to load alert config:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const payload: any = {
        enabled,
        telegramChatId: chatId,
        whatsappPhone: waPhone,
        cooldownMinutes: Number(cooldown),
        instruments: selectedInstruments,
      };

      if (botToken.trim()) {
        payload.telegramBotToken = botToken.trim();
      }
      if (waApiKey.trim()) {
        payload.whatsappApiKey = waApiKey.trim();
      }

      const res = await api.updateAlertConfig(payload);
      if (res.success) {
        setConfig(res.config);
        setBotToken('');
        setWaApiKey('');
        setTestResult({ success: true, message: 'Alert configuration saved successfully!' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Save failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTg(true);
    setTestResult(null);
    try {
      const payload = {
        token: botToken.trim() || undefined,
        chatId: chatId.trim() || undefined,
      };
      const res = await api.testTelegramAlert(payload);
      setTestResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Telegram test failed' });
    } finally {
      setIsTestingTg(false);
    }
  };

  const handleTestWhatsapp = async () => {
    setIsTestingWa(true);
    setTestResult(null);
    try {
      const payload = {
        phone: waPhone.trim() || undefined,
        apiKey: waApiKey.trim() || undefined,
      };
      const res = await api.testWhatsappAlert(payload);
      setTestResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'WhatsApp test failed' });
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleScanNow = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await api.triggerAlertScan();
      setScanResult({ count: res.dispatched_count, message: res.message });
      // Refresh config to update lastAlertsSent
      const cfgRes = await api.getAlertConfig();
      if (cfgRes.success) setConfig(cfgRes.config);
    } catch (err: any) {
      setScanResult({ count: 0, message: `Scan failed: ${err.message}` });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleInstrument = (symbol: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-section)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <span>MARKET BIAS ALERTS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-sans font-semibold border border-emerald-500/30">
                  2+ Confluence Filter
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-sans">
                Real-time Telegram & WhatsApp alerts when setups reach Look for Buy / Look for Sell
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Master Enable Banner */}
          <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section-alt)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              <div>
                <span className="font-bold text-[var(--text-primary)] block">
                  Automated Alert Dispatcher
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-sans">
                  {enabled
                    ? 'Active — Engine scans continuously and broadcasts newly confirmed signals.'
                    : 'Paused — No notifications are sent to Telegram/WhatsApp.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`px-3.5 py-1.5 rounded-md font-bold text-xs transition cursor-pointer ${
                enabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[var(--border-subtle)] hover:bg-[var(--border-strong)] text-[var(--text-secondary)]'
              }`}
            >
              {enabled ? 'ACTIVE' : 'PAUSED'}
            </button>
          </div>

          {/* Feedback Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 font-sans text-xs ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {scanResult && (
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-start gap-2.5 font-sans text-xs">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanResult.message}</span>
            </div>
          )}

          {/* Section 1: Telegram Bot Configuration */}
          <div className="space-y-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-500" />
                <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Telegram Bot Settings
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-sans">
                Primary Outbound Channel
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Telegram Bot Token {config?.hasTelegramToken && <span className="text-emerald-500 font-bold">(Configured: {config.telegramBotTokenMasked})</span>}
                </label>
                <input
                  type="password"
                  placeholder={config?.hasTelegramToken ? 'Enter new token only to change...' : 'e.g. 7123456789:AAH...'}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5">
                  Dapatkan Bot Token secara gratis dari <span className="text-[var(--accent)] font-semibold">@BotFather</span> di Telegram.
                </p>
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Chat ID / Channel Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789 (User/Group ID) or @my_channel"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5">
                  Chat ID pribadi/grup Anda. Dapatkan ID Anda via bot <span className="text-[var(--accent)] font-semibold">@userinfobot</span> di Telegram.
                </p>
              </div>

              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTg || (!chatId && !config?.telegramChatId)}
                  className="px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isTestingTg ? 'Sending Test...' : 'Send Telegram Test Message'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: WhatsApp Configuration (Optional) */}
          <div className="space-y-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  WhatsApp Gateway (Optional via CallMeBot)
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-sans">
                Optional
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Phone Number (with country code)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +6281234567890"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  CallMeBot API Key
                </label>
                <input
                  type="password"
                  placeholder={config?.hasWhatsappKey ? 'Key configured (leave blank to keep)' : 'API Key from CallMeBot'}
                  value={waApiKey}
                  onChange={(e) => setWaApiKey(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-[var(--text-muted)] font-sans">
                Kirim pesan WhatsApp gratis ke nomor Anda menggunakan gateway CallMeBot.
              </p>
              <button
                type="button"
                onClick={handleTestWhatsapp}
                disabled={isTestingWa || !waPhone}
                className="px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isTestingWa ? 'Sending...' : 'Test WhatsApp'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Alert Filter & Cooldown Rules */}
          <div className="space-y-3 p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section)]">
            <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider block">
              Confluence & Cooldown Rules
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Trigger Threshold
                </label>
                <div className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] text-[var(--text-primary)]">
                  <span className="font-bold text-emerald-500">2+ Confluences Aligned</span>
                  <p className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5">
                    Hanya mengirimkan notifikasi saat terbentuk aksi <b>LOOK FOR BUY</b> atau <b>LOOK FOR SELL</b> (minimal 2 pilar selaras tanpa divergensi).
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Repeat Alert Cooldown
                </label>
                <select
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] outline-none"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={120}>120 Minutes (2 Hours - Recommended)</option>
                  <option value={240}>240 Minutes (4 Hours)</option>
                  <option value={480}>480 Minutes (8 Hours)</option>
                </select>
                <p className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5">
                  Mencegah spam; sinyal pada pair yang sama tidak akan dikirim ulang sebelum masa cooldown berakhir (kecuali jika arah bias berbalik).
                </p>
              </div>
            </div>

            {/* Instruments Filter */}
            <div className="pt-2">
              <label className="text-[11px] text-[var(--text-secondary)] block mb-1.5">
                Active Instruments for Alerts
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_INSTRUMENTS.map((inst) => {
                  const isSelected = selectedInstruments.includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleInstrument(inst)}
                      className={`px-2.5 py-1 rounded text-[10.5px] font-bold transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                      }`}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Recent Dispatched Alerts */}
          {config?.lastAlertsSent && Object.keys(config.lastAlertsSent).length > 0 && (
            <div className="space-y-2 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-section-alt)]">
              <span className="text-[10.5px] font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                Recently Broadcast Alerts
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(config.lastAlertsSent).map(([sym, item]) => (
                  <div
                    key={sym}
                    className="flex items-center justify-between text-[10px] p-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-hairline)]"
                  >
                    <span className="font-bold text-[var(--text-primary)]">{sym}</span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded ${
                        item.action === 'LOOK_FOR_BUY'
                          ? 'text-emerald-500 bg-emerald-500/10'
                          : 'text-rose-500 bg-rose-500/10'
                      }`}
                    >
                      {item.action.replace(/_/g, ' ')}
                    </span>
                    <span className="tabular-nums text-[var(--text-muted)]">
                      {new Date(item.sentAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-section)]">
          <button
            type="button"
            onClick={handleScanNow}
            disabled={isScanning || !enabled}
            className="px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan & Broadcast Now'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

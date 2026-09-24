import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Check,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { MarketAlertPublicConfig } from '../types';

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

export const AdminAlertManager: React.FC = () => {
  const [config, setConfig] = useState<MarketAlertPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [cooldown, setCooldown] = useState(120);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(ALL_INSTRUMENTS);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [isTestingWa, setIsTestingWa] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ count: number; message: string } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
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

  useEffect(() => {
    loadConfig();
  }, []);

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
        setTestResult({ success: true, message: 'Market bias alert settings saved successfully!' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Save error: ${err.message}` });
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
      setTestResult({ success: false, message: err.message || 'Telegram test error' });
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
      setTestResult({ success: false, message: err.message || 'WhatsApp test error' });
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
      loadConfig();
    } catch (err: any) {
      setScanResult({ count: 0, message: `Scan error: ${err.message}` });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleInstrument = (symbol: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
        <span>Loading Market Alert Configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header Banner */}
      <div className="p-4 rounded-lg bg-[var(--bg-section)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <span>Market Bias Alert Broadcast System</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-sans font-semibold border border-emerald-500/30">
                2+ Confluence Rule
              </span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] font-sans mt-0.5">
              Broadcasts immediate Telegram and WhatsApp alerts whenever an instrument confirms Look for Buy or Look for Sell.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`px-3.5 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              enabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            {enabled ? 'BROADCAST ACTIVE' : 'BROADCAST PAUSED'}
          </button>
        </div>
      </div>

      {/* Test / Scan Feedback */}
      {testResult && (
        <div
          className={`p-3 rounded-lg border flex items-start gap-2 font-sans text-xs ${
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
        <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-start gap-2 font-sans text-xs">
          <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{scanResult.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Telegram Config */}
        <div className="p-4 rounded-lg bg-[var(--bg-section)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-500" />
              <span>Telegram Bot Connection</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-sans">
              Recommended
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                Telegram Bot Token {config?.hasTelegramToken && <span className="text-emerald-500 font-bold">({config.telegramBotTokenMasked})</span>}
              </label>
              <input
                type="password"
                placeholder={config?.hasTelegramToken ? 'Enter new token to overwrite...' : 'e.g. 7123456789:AAH...'}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
              <p className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5">
                Dapatkan Bot Token dari <span className="text-[var(--accent)] font-semibold">@BotFather</span> di Telegram.
              </p>
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                Chat ID / Channel ID
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789 or @channel_handle"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
              <p className="text-[10px] text-[var(--text-muted)] font-sans mt-0.5">
                Dapatkan ID akun/grup Telegram via bot <span className="text-[var(--accent)] font-semibold">@userinfobot</span>.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTg || (!chatId && !config?.telegramChatId)}
                className="px-3 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>{isTestingTg ? 'Sending...' : 'Test Telegram Alert'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp Config */}
        <div className="p-4 rounded-lg bg-[var(--bg-section)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>WhatsApp Integration (CallMeBot)</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)] font-sans">
              Optional
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                WhatsApp Phone Number (+country code)
              </label>
              <input
                type="text"
                placeholder="e.g. +6281234567890"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
                CallMeBot API Key
              </label>
              <input
                type="password"
                placeholder={config?.hasWhatsappKey ? 'API Key configured' : 'API Key from CallMeBot'}
                value={waApiKey}
                onChange={(e) => setWaApiKey(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleTestWhatsapp}
                disabled={isTestingWa || !waPhone}
                className="px-3 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isTestingWa ? 'Sending...' : 'Test WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rules and Instruments */}
      <div className="p-4 rounded-lg bg-[var(--bg-section)] border border-[var(--border-subtle)] space-y-3">
        <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider block">
          Instruments & Cooldown Filter
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
              Minimum Confirmations
            </label>
            <div className="p-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[11px] font-bold text-emerald-500">
              2+ Confluences (LOOK FOR BUY / LOOK FOR SELL)
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
              Anti-Spam Cooldown
            </label>
            <select
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] outline-none"
            >
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes (1 Hour)</option>
              <option value={120}>120 Minutes (2 Hours)</option>
              <option value={240}>240 Minutes (4 Hours)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[var(--text-secondary)] block mb-1">
            Active Instruments
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

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleScanNow}
          disabled={isScanning || !enabled}
          className="px-3.5 py-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-section)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning...' : 'Manual Scan & Broadcast Now'}</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] font-bold transition cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  ShieldCheck,
  Server,
  Lock,
  Key,
  ExternalLink,
  Info,
  Clock,
  Check,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { SmtpConfigSummary, SmtpTestResponse } from '../types';

interface AdminSmtpTesterProps {
  currentUserEmail?: string;
  onStatusChange?: () => void;
}

export const AdminSmtpTester: React.FC<AdminSmtpTesterProps> = ({
  currentUserEmail,
  onStatusChange,
}) => {
  const [config, setConfig] = useState<SmtpConfigSummary | null>(null);
  const [lastSent, setLastSent] = useState<{
    to: string;
    subject: string;
    sentAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SmtpTestResponse | null>(null);

  // Test form state
  const [sendRealEmail, setSendRealEmail] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState(currentUserEmail || '');
  const [showGuide, setShowGuide] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getSmtpStatus();
      if (res.success) {
        setConfig(res.config);
        setLastSent(res.last_sent || null);
      }
    } catch (err: any) {
      console.warn('Failed to load SMTP status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    if (currentUserEmail && !recipientEmail) {
      setRecipientEmail(currentUserEmail);
    }
  }, [currentUserEmail]);

  const handleTestConnection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setTesting(true);
      setTestResult(null);

      const payload = {
        send_test_email: sendRealEmail && Boolean(recipientEmail.trim()),
        recipient: sendRealEmail ? recipientEmail.trim() : undefined,
      };

      const result = await api.testSmtpConnection(payload);
      setTestResult(result);
      if (result.config) {
        setConfig(result.config);
      }
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setTestResult({
        success: false,
        connected: false,
        testEmailSent: false,
        message: err.message || 'Gagal menghubungi server untuk uji SMTP.',
        details: 'Pastikan server backend aktif dan token sesi admin valid.',
        config: config || {
          configured: false,
          host: 'unknown',
          port: 587,
          secure: false,
          hasUser: false,
          hasPass: false,
          passLength: 0,
          userMasked: '',
          isEmailValid: false,
          mode: 'DEVELOPMENT_SIMULATION',
        },
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-[var(--text-primary)]" id="admin-smtp-verifier-module">
      {/* 1. Header Banner & Current Status */}
      <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-inner">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono tracking-tight text-[var(--text-primary)]">
                Verifikasi & Tes Koneksi SMTP Server
              </h2>
              {config && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    config.configured
                      ? 'bg-[var(--bullish-bg)] text-[var(--bullish)] border-[var(--bullish-border)]'
                      : 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]'
                  }`}
                >
                  {config.configured ? '● LIVE SMTP READY' : '○ SIMULATION MODE'}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans">
              Uji coba koneksi langsung ke mail server (Gmail/Brevo/SendGrid) untuk memvalidasi kredensial{' '}
              <code className="text-[var(--accent)] font-mono">SMTP_USER</code> dan{' '}
              <code className="text-[var(--accent)] font-mono">SMTP_PASS</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-section-alt)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] text-xs font-mono flex items-center gap-1.5 border border-[var(--border-strong)] transition cursor-pointer disabled:opacity-50"
            title="Muat ulang status konfigurasi dari server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
            <span>Segarkan Status</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent-subtle)] hover:bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-mono flex items-center gap-1.5 border border-[var(--accent)] transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showGuide ? 'Tutup Panduan' : 'Panduan Kredensial'}</span>
          </button>
        </div>
      </div>

      {/* Guide Box (Optional Dropdown) */}
      {showGuide && (
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent)] text-xs text-[var(--text-secondary)] space-y-3 font-sans">
          <div className="flex items-center gap-2 text-[var(--accent)] font-bold font-mono">
            <Info className="w-4 h-4" />
            <span>Cara Mendapatkan Kredensial Google App Password (Gmail SMTP)</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-secondary)] leading-relaxed">
            <li>
              Buka akun Google pengirim, pastikan <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> telah aktif.
            </li>
            <li>
              Kunjungi halaman resmi kata sandi aplikasi Google:{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] underline inline-flex items-center gap-0.5 hover:text-[var(--accent)]"
              >
                myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              Buat nama aplikasi baru (misal: <em>ArahMarket Terminal</em>), lalu klik <strong>Generate</strong>.
            </li>
            <li>
              Salin kode 16-karakter yang muncul (misal: <code className="bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded text-[var(--accent)] font-mono">abcd efgh ijkl mnop</code>).
            </li>
            <li>
              Simpan pada Environment Variables:
              <div className="mt-1 p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] space-y-0.5">
                <div>SMTP_USER=emailanda@gmail.com</div>
                <div>SMTP_PASS=abcdefghijklmnop <span className="text-[var(--text-muted)]">(spasi akan otomatis dihapus oleh sistem)</span></div>
                <div>SMTP_HOST=smtp.gmail.com</div>
                <div>SMTP_PORT=587</div>
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* 2. Configuration Inspection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        {/* Host & Port */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="text-[var(--text-muted)] text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>SERVER & PORT</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">{config?.port === 465 ? 'SSL' : 'STARTTLS'}</span>
          </div>
          <div className="text-[var(--text-primary)] font-bold truncate">
            {config?.host || 'smtp.gmail.com'}:{config?.port || 587}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {config?.secure ? 'Koneksi TLS Langsung (Port 465)' : 'Koneksi STARTTLS (Port 587)'}
          </div>
        </div>

        {/* Sender User */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="text-[var(--text-muted)] text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>PENGIRIM (SMTP_USER)</span>
            </span>
            {config?.hasUser && (
              <span className={`text-[10px] ${config.isEmailValid ? 'text-[var(--bullish)]' : 'text-[var(--warning)]'}`}>
                {config.isEmailValid ? 'Format Valid' : 'Format Invalid'}
              </span>
            )}
          </div>
          <div className="text-[var(--text-primary)] font-bold truncate">
            {config?.userMasked || <span className="text-[var(--text-muted)] font-normal">Belum ditentukan</span>}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] truncate">
            {config?.hasUser ? 'Kredensial akun email terpasang' : 'Variabel SMTP_USER kosong'}
          </div>
        </div>

        {/* Password Status */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="text-[var(--text-muted)] text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>PASSWORD (SMTP_PASS)</span>
            </span>
            {config?.hasPass && (
              <span className="text-[10px] text-[var(--bullish)]">
                {config.passLength} Karakter
              </span>
            )}
          </div>
          <div className="text-[var(--text-primary)] font-bold">
            {config?.hasPass ? (
              <span className="text-[var(--bullish)]">●●●●●●●● Terisi</span>
            ) : (
              <span className="text-[var(--bearish)]">Belum Terisi</span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {config?.hasPass
              ? 'Google App Password terlindungi'
              : 'Memerlukan kata sandi aplikasi 16-karakter'}
          </div>
        </div>

        {/* Operational Mode */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="text-[var(--text-muted)] text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>STATUS OPERASIONAL</span>
            </span>
          </div>
          <div className="text-[var(--text-primary)] font-bold">
            {config?.configured ? (
              <span className="text-[var(--bullish)] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live Delivery Siap</span>
              </span>
            ) : (
              <span className="text-[var(--warning)] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulasi Lokal</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {config?.configured
              ? 'Email aktivasi terkirim langsung'
              : 'Verifikasi instan via Admin Panel'}
          </div>
        </div>
      </div>

      {/* 3. Interactive Test Panel */}
      <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-[var(--accent)]" />
            <span>Eksekusi Uji Koneksi & Verifikasi Pengiriman</span>
          </h3>
          {lastSent && (
            <div className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Email Terakhir: {lastSent.to}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleTestConnection} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7 space-y-1.5 font-mono text-xs">
              <label className="block text-[var(--text-secondary)] font-semibold text-[11px]">
                Kirim Email Uji Coba Ke (Inbox Penerima)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="Masukkan alamat email penerima (contoh: emailanda@gmail.com)..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent)] transition text-xs font-sans"
                  id="smtp-test-recipient-input"
                />
              </div>
            </div>

            <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
              <label className="flex items-center gap-2 text-xs font-sans text-[var(--text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendRealEmail}
                  onChange={e => setSendRealEmail(e.target.checked)}
                  className="rounded border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--accent)] focus:ring-[var(--accent)] h-4 w-4"
                />
                <span>Kirim email uji coba nyata</span>
              </label>

              <button
                type="submit"
                disabled={testing}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] font-bold font-mono text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-[var(--shadow-raised)] disabled:opacity-50 whitespace-nowrap"
                id="smtp-test-submit-button"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menguji Koneksi...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Uji Koneksi SMTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* 4. Live Test Result Display */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-mono space-y-3 transition-all animate-fade ${
              testResult.success
                ? 'bg-[var(--bullish-bg)] border-[var(--bullish-border)] text-[var(--bullish)]'
                : 'bg-[var(--bearish-bg)] border-[var(--bearish-border)] text-[var(--bearish)]'
            }`}
            id="smtp-test-result-box"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-[var(--bullish)] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-[var(--bearish)] shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {testResult.success ? 'KONEKSI SMTP TERVERIFIKASI SUKSES' : 'PENGUJIAN KONEKSI SMTP GAGAL'}
                  </div>
                  <div className="text-xs opacity-90 font-sans leading-relaxed">
                    {testResult.message}
                  </div>
                </div>
              </div>

              {testResult.latencyMs !== undefined && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--accent)] font-mono">
                    {testResult.latencyMs} ms
                  </span>
                </div>
              )}
            </div>

            {/* Diagnostic Details */}
            {testResult.details && (
              <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] font-sans leading-relaxed text-[var(--text-secondary)] space-y-1">
                <div className="font-semibold text-[var(--accent)] flex items-center gap-1.5 font-mono">
                  <Info className="w-3.5 h-3.5" />
                  <span>Rincian Diagnostik:</span>
                </div>
                <p>{testResult.details}</p>
              </div>
            )}

            {/* Test Summary Pill */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-[var(--text-secondary)] font-mono">
              <span className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                Server: {testResult.config.host}:{testResult.config.port}
              </span>
              <span className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                Pengirim: {testResult.config.userMasked || 'None'}
              </span>
              <span className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                Email Terkirim: {testResult.testEmailSent ? 'Ya (Sukses)' : 'Tidak'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

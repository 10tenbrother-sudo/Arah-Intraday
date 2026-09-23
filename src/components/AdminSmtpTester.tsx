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
    <div className="space-y-4 font-sans text-slate-100" id="admin-smtp-verifier-module">
      {/* 1. Header Banner & Current Status */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono tracking-tight text-slate-100">
                Verifikasi & Tes Koneksi SMTP Server
              </h2>
              {config && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    config.configured
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                      : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                  }`}
                >
                  {config.configured ? '● LIVE SMTP READY' : '○ SIMULATION MODE'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Uji coba koneksi langsung ke mail server (Gmail/Brevo/SendGrid) untuk memvalidasi kredensial{' '}
              <code className="text-cyan-300 font-mono">SMTP_USER</code> dan{' '}
              <code className="text-cyan-300 font-mono">SMTP_PASS</code>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Muat ulang status konfigurasi dari server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Segarkan Status</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 text-xs font-mono flex items-center gap-1.5 border border-cyan-800/80 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showGuide ? 'Tutup Panduan' : 'Panduan Kredensial'}</span>
          </button>
        </div>
      </div>

      {/* Guide Box (Optional Dropdown) */}
      {showGuide && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-800/60 text-xs text-slate-300 space-y-3 font-sans">
          <div className="flex items-center gap-2 text-cyan-300 font-bold font-mono">
            <Info className="w-4 h-4" />
            <span>Cara Mendapatkan Kredensial Google App Password (Gmail SMTP)</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
            <li>
              Buka akun Google pengirim, pastikan <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> telah aktif.
            </li>
            <li>
              Kunjungi halaman resmi kata sandi aplikasi Google:{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline inline-flex items-center gap-0.5 hover:text-cyan-300"
              >
                myaccount.google.com/apppasswords <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              Buat nama aplikasi baru (misal: <em>ArahMarket Terminal</em>), lalu klik <strong>Generate</strong>.
            </li>
            <li>
              Salin kode 16-karakter yang muncul (misal: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-cyan-300 font-mono">abcd efgh ijkl mnop</code>).
            </li>
            <li>
              Simpan pada Environment Variables:
              <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-0.5">
                <div>SMTP_USER=emailanda@gmail.com</div>
                <div>SMTP_PASS=abcdefghijklmnop <span className="text-slate-500">(spasi akan otomatis dihapus oleh sistem)</span></div>
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
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-slate-500 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>SERVER & PORT</span>
            </span>
            <span className="text-[10px] text-slate-500">{config?.port === 465 ? 'SSL' : 'STARTTLS'}</span>
          </div>
          <div className="text-slate-200 font-bold truncate">
            {config?.host || 'smtp.gmail.com'}:{config?.port || 587}
          </div>
          <div className="text-[10px] text-slate-400">
            {config?.secure ? 'Koneksi TLS Langsung (Port 465)' : 'Koneksi STARTTLS (Port 587)'}
          </div>
        </div>

        {/* Sender User */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-slate-500 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>PENGIRIM (SMTP_USER)</span>
            </span>
            {config?.hasUser && (
              <span className={`text-[10px] ${config.isEmailValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                {config.isEmailValid ? 'Format Valid' : 'Format Invalid'}
              </span>
            )}
          </div>
          <div className="text-slate-200 font-bold truncate">
            {config?.userMasked || <span className="text-slate-600 font-normal">Belum ditentukan</span>}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {config?.hasUser ? 'Kredensial akun email terpasang' : 'Variabel SMTP_USER kosong'}
          </div>
        </div>

        {/* Password Status */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-slate-500 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>PASSWORD (SMTP_PASS)</span>
            </span>
            {config?.hasPass && (
              <span className="text-[10px] text-emerald-400">
                {config.passLength} Karakter
              </span>
            )}
          </div>
          <div className="text-slate-200 font-bold">
            {config?.hasPass ? (
              <span className="text-emerald-400">●●●●●●●● Terisi</span>
            ) : (
              <span className="text-rose-400">Belum Terisi</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            {config?.hasPass
              ? 'Google App Password terlindungi'
              : 'Memerlukan kata sandi aplikasi 16-karakter'}
          </div>
        </div>

        {/* Operational Mode */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="text-slate-500 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>STATUS OPERASIONAL</span>
            </span>
          </div>
          <div className="text-slate-200 font-bold">
            {config?.configured ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live Delivery Siap</span>
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulasi Lokal</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            {config?.configured
              ? 'Email aktivasi terkirim langsung'
              : 'Verifikasi instan via Admin Panel'}
          </div>
        </div>
      </div>

      {/* 3. Interactive Test Panel */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Eksekusi Uji Koneksi & Verifikasi Pengiriman</span>
          </h3>
          {lastSent && (
            <div className="text-[11px] font-mono text-slate-500 hidden sm:flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Email Terakhir: {lastSent.to}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleTestConnection} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7 space-y-1.5 font-mono text-xs">
              <label className="block text-slate-300 font-semibold text-[11px]">
                Kirim Email Uji Coba Ke (Inbox Penerima)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="Masukkan alamat email penerima (contoh: emailanda@gmail.com)..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-cyan-500 transition text-xs font-sans"
                  id="smtp-test-recipient-input"
                />
              </div>
            </div>

            <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
              <label className="flex items-center gap-2 text-xs font-sans text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendRealEmail}
                  onChange={e => setSendRealEmail(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500 h-4 w-4"
                />
                <span>Kirim email uji coba nyata</span>
              </label>

              <button
                type="submit"
                disabled={testing}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50 whitespace-nowrap"
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
                ? 'bg-emerald-950/50 border-emerald-600/70 text-emerald-200'
                : 'bg-rose-950/60 border-rose-700/80 text-rose-200'
            }`}
            id="smtp-test-result-box"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
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
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono">
                    {testResult.latencyMs} ms
                  </span>
                </div>
              )}
            </div>

            {/* Diagnostic Details */}
            {testResult.details && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-sans leading-relaxed text-slate-300 space-y-1">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5 font-mono">
                  <Info className="w-3.5 h-3.5" />
                  <span>Rincian Diagnostik:</span>
                </div>
                <p>{testResult.details}</p>
              </div>
            )}

            {/* Test Summary Pill */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
              <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                Server: {testResult.config.host}:{testResult.config.port}
              </span>
              <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                Pengirim: {testResult.config.userMasked || 'None'}
              </span>
              <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                Email Terkirim: {testResult.testEmailSent ? 'Ya (Sukses)' : 'Tidak'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

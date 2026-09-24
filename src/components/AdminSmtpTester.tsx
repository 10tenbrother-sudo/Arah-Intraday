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
        message: err.message || 'Could not reach the server for the SMTP test.',
        details: 'Make sure the backend server is running and the admin session token is valid.',
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
                SMTP server verification and connection test
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
              Test a direct connection to the mail server (Gmail/Brevo/SendGrid) to validate the credentials{' '}
              <code className="text-[var(--accent)] font-mono">SMTP_USER</code> and{' '}
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
            title="Reload the configuration status from the server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent)]' : ''}`} />
            <span>Refresh Status</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent-subtle)] hover:bg-[var(--accent-subtle)] text-[var(--accent)] text-xs font-mono flex items-center gap-1.5 border border-[var(--accent)] transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showGuide ? 'Close guide' : 'Credentials guide'}</span>
          </button>
        </div>
      </div>

      {/* Guide Box (Optional Dropdown) */}
      {showGuide && (
        <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent)] text-xs text-[var(--text-secondary)] space-y-3 font-sans">
          <div className="flex items-center gap-2 text-[var(--accent)] font-bold font-mono">
            <Info className="w-4 h-4" />
            <span>How to Obtain Google App Password Credentials (Gmail SMTP)</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-secondary)] leading-relaxed">
            <li>
              Open your Google Account and ensure <strong>2-Step Verification</strong> is turned on.
            </li>
            <li>
              Visit Google's official App Passwords portal:{' '}
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
              Enter an app name (e.g. <em>ArahMarket Terminal</em>), then click <strong>Create</strong>.
            </li>
            <li>
              Copy the 16-character password displayed (e.g. <code className="bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded text-[var(--accent)] font-mono">abcd efgh ijkl mnop</code>).
            </li>
            <li>
              Configure in environment variables:
              <div className="mt-1 p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] space-y-0.5">
                <div>SMTP_USER=your_email@gmail.com</div>
                <div>SMTP_PASS=abcdefghijklmnop <span className="text-[var(--text-muted)]">(spaces are stripped automatically)</span></div>
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
            {config?.secure ? 'Direct TLS connection (port 465)' : 'STARTTLS connection (port 587)'}
          </div>
        </div>

        {/* Sender User */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="text-[var(--text-muted)] text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>SENDER (SMTP_USER)</span>
            </span>
            {config?.hasUser && (
              <span className={`text-[10px] ${config.isEmailValid ? 'text-[var(--bullish)]' : 'text-[var(--warning)]'}`}>
                {config.isEmailValid ? 'Valid format' : 'Invalid format'}
              </span>
            )}
          </div>
          <div className="text-[var(--text-primary)] font-bold truncate">
            {config?.userMasked || <span className="text-[var(--text-muted)] font-normal">Not set</span>}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] truncate">
            {config?.hasUser ? 'Email account credentials configured' : 'SMTP_USER variable is empty'}
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
                {config.passLength} Characters
              </span>
            )}
          </div>
          <div className="text-[var(--text-primary)] font-bold">
            {config?.hasPass ? (
              <span className="text-[var(--bullish)]">●●●●●●●● Set</span>
            ) : (
              <span className="text-[var(--bearish)]">Not set</span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {config?.hasPass
              ? 'Google App Password protected'
              : 'Requires a 16-character app password'}
          </div>
        </div>

        {/* Operational Mode */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
          <div className="text-[var(--text-muted)] text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>OPERATIONAL STATUS</span>
            </span>
          </div>
          <div className="text-[var(--text-primary)] font-bold">
            {config?.configured ? (
              <span className="text-[var(--bullish)] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live Delivery Ready</span>
              </span>
            ) : (
              <span className="text-[var(--warning)] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulation Mode</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">
            {config?.configured
              ? 'Activation email sent directly'
              : 'Instant verification via admin panel'}
          </div>
        </div>
      </div>

      {/* 3. Interactive Test Panel */}
      <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Send className="w-4 h-4 text-[var(--accent)]" />
            <span>Run connection test and verify delivery</span>
          </h3>
          {lastSent && (
            <div className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[var(--text-muted)]" />
              <span>Last Email: {lastSent.to}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleTestConnection} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7 space-y-1.5 font-mono text-xs">
              <label className="block text-[var(--text-secondary)] font-semibold text-[11px]">
                Send test email to (recipient inbox)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  placeholder="Enter the recipient email address (e.g. you@example.com)..."
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
                <span>Send a real test email</span>
              </label>

              <button
                type="submit"
                disabled={testing}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] font-bold font-mono text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-[var(--shadow-raised)] shadow-[var(--shadow-raised)] disabled:opacity-50 whitespace-nowrap"
                id="smtp-test-submit-button"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing connection...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Test SMTP connection</span>
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
                    {testResult.success ? 'SMTP CONNECTION VERIFIED' : 'SMTP CONNECTION TEST FAILED'}
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
                  <span>Diagnostic Details:</span>
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
                Sender: {testResult.config.userMasked || 'None'}
              </span>
              <span className="bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                Dispatched: {testResult.testEmailSent ? 'Yes (success)' : 'No'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

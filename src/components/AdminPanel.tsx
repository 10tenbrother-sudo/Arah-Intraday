import React, { useState, useEffect } from 'react';
import {
  Shield,
  Radio,
  Plus,
  Trash2,
  Power,
  RefreshCw,
  Layers,
  Database,
  Activity,
  Send,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Users,
  Edit2,
  Check,
  X,
  Mail,
} from 'lucide-react';
import { api } from '../lib/api';
import { TelegramChannel, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUserManagement } from './AdminUserManagement';
import { PageHeader } from './shared/PageHeader';
import { AdminSmtpTester } from './AdminSmtpTester';

interface AdminPanelProps {
  currentUser?: User | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'smtp' | 'telegram' | 'sources' | 'duplicates' | 'health' | 'test'>('users');

  // Users state
  const [usersList, setUsersList] = useState<User[]>([]);

  // Telegram state
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [newHandle, setNewHandle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newLang, setNewLang] = useState('en');

  // Sources state
  const [sources, setSources] = useState<any[]>([]);

  // Health state
  const [health, setHealth] = useState<any>(null);

  // Duplicates state
  const [duplicates, setDuplicates] = useState<any[]>([]);

  // Test injection state
  const [testTitle, setTestTitle] = useState('');
  const [testContent, setTestContent] = useState('');
  const [testLang, setTestLang] = useState('en');
  const [testSource, setTestSource] = useState('Bloomberg Terminal Wire');
  const [testResult, setTestResult] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chRes, srcRes, healthRes, dupRes, userRes] = await Promise.allSettled([
        api.getTelegramChannels(),
        api.getSources(),
        api.getSystemHealth(),
        api.getDuplicates(),
        api.getAdminUsers(),
      ]);

      if (chRes.status === 'fulfilled') setChannels(chRes.value.channels);
      if (srcRes.status === 'fulfilled') setSources(srcRes.value.sources);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      if (dupRes.status === 'fulfilled') setDuplicates(dupRes.value.events);
      if (userRes.status === 'fulfilled') setUsersList(userRes.value.users);
    } catch (err: any) {
      console.warn('Admin load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandle) return;
    try {
      setErrorMessage(null);
      await api.addTelegramChannel(newHandle, newTitle || newHandle, newLang);
      setNewHandle('');
      setNewTitle('');
      setActionNotice(`Channel ${newHandle} added successfully.`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add channel');
    }
  };

  const handleToggleChannel = async (handle: string, current: boolean) => {
    try {
      setErrorMessage(null);
      await api.toggleTelegramChannel(handle, !current);
      setActionNotice(`Channel ${handle} toggled ${!current ? 'ON' : 'OFF'}.`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to toggle channel');
    }
  };

  const handleDeleteChannel = async (handle: string) => {
    try {
      setErrorMessage(null);
      await api.deleteTelegramChannel(handle);
      setActionNotice(`Channel ${handle} deleted.`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete channel');
    }
  };

  const handleScrapeChannel = async (handle: string) => {
    try {
      setErrorMessage(null);
      setActionNotice(`Scraping ${handle}...`);
      const res = await api.triggerTelegramScrape(handle);
      setActionNotice(`Scraped ${res.result?.count || 0} posts from ${handle}.`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to scrape channel');
    }
  };

  const handleInjectTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle) return;
    try {
      setErrorMessage(null);
      const res = await api.injectTestArticle({
        title: testTitle,
        content: testContent,
        language: testLang,
        source_name: testSource,
      });
      setTestResult(res.outcome);
      setActionNotice(`Article processed. Duplicate detected: ${res.outcome?.isDuplicate ? 'YES' : 'NO'}`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process test article');
    }
  };

  const handleRunAllIngest = async () => {
    try {
      setErrorMessage(null);
      setActionNotice('Running global multi-source ingestion...');
      await api.runGlobalIngest();
      setActionNotice('Global multi-source ingestion completed successfully.');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ingestion failed');
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <PageHeader
        eyebrow="TOOLS · SYSTEM & FEEDS"
        title="Admin control center"
        description="Ingestion pipeline management · deduplication engine · source registry."
        actions={
          <>
            {errorMessage && (
              <span className="text-xs font-mono text-[var(--bearish)] bg-[var(--bearish-bg)] px-2.5 py-1 rounded border border-[var(--bearish-border)] animate-fade">
                {errorMessage}
              </span>
            )}

            {actionNotice && (
              <span className="text-xs font-mono text-[var(--accent-strong)] bg-[var(--accent-subtle)] px-2.5 py-1 rounded border border-[var(--accent-border)] animate-fade">
                {actionNotice}
              </span>
            )}

            <button
              onClick={handleRunAllIngest}
              disabled={loading}
              className="btn-primary-institutional flex items-center gap-1.5 px-3 h-8 rounded-md text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Run all ingestion</span>
            </button>
          </>
        }
      />

      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-5 space-y-5">
      {/* Admin Subtabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] pb-2 text-xs font-mono overflow-x-auto">
        {[
          { id: 'users', label: 'Users & Subscriptions', count: usersList.length },
          { id: 'smtp', label: 'SMTP & Email Tester' },
          { id: 'telegram', label: 'Telegram Channels', count: channels.length },
          { id: 'sources', label: 'Data Sources Registry', count: sources.length },
          { id: 'duplicates', label: 'Deduplicated Events', count: duplicates.length },
          { id: 'test', label: 'Deduplication Live Tester' },
          { id: 'health', label: 'System & Database Health' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-[var(--bg-surface)] text-[var(--accent)] border border-[var(--accent)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-section-alt)] text-[var(--text-secondary)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 0: Users & Subscriptions Management */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-4"
        >
          {activeSubTab === 'users' && (
            <AdminUserManagement
              currentUser={currentUser}
              onUserModified={loadData}
            />
          )}

          {/* Tab SMTP: Live Connection & Email Tester */}
          {activeSubTab === 'smtp' && (
            <AdminSmtpTester
              currentUserEmail={currentUser?.email}
              onStatusChange={loadData}
            />
          )}

      {/* Tab 1: Telegram Channels */}
      {activeSubTab === 'telegram' && (
        <div className="space-y-4">
          {/* Add Channel Form */}
          <form onSubmit={handleAddTelegram} className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <h3 className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Register New Telegram Public Channel</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
              <input
                type="text"
                placeholder="@channel_handle (e.g. @financialjuice)"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                required
                className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
              <input
                type="text"
                placeholder="Channel Display Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
              />
              <select
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-1.5 rounded text-[var(--text-primary)] outline-none"
              >
                <option value="en">English (en)</option>
                <option value="id">Indonesian (id)</option>
                <option value="es">Spanish (es)</option>
                <option value="de">German (de)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] font-bold transition cursor-pointer"
              >
                + Register Channel
              </button>
            </div>
          </form>

          {/* Channels List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] uppercase text-[10px]">
                  <th className="py-2 px-2.5">Handle / Title</th>
                  <th className="py-2 px-2.5">Language</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Last Ingested</th>
                  <th className="py-2 px-2.5">Errors</th>
                  <th className="py-2 px-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {channels.map(ch => (
                  <tr key={ch.id} className="hover:bg-[var(--bg-surface)] transition">
                    <td className="py-2.5 px-2.5">
                      <div className="font-bold text-[var(--text-primary)]">{ch.handle}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{ch.title}</div>
                    </td>

                    <td className="py-2.5 px-2.5 uppercase text-[var(--text-secondary)]">
                      {ch.language}
                    </td>

                    <td className="py-2.5 px-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        ch.status === 'LIVE' ? 'bg-[var(--bullish-bg)] text-[var(--bullish)] border-[var(--bullish-border)]' :
                        ch.status === 'DELAYED' ? 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]' :
                        'bg-[var(--bearish-bg)] text-[var(--bearish)] border-[var(--bearish-border)]'
                      }`}>
                        {ch.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">
                      {ch.last_ingested_at ? new Date(ch.last_ingested_at).toLocaleTimeString() : 'Pending'}
                    </td>

                    <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">
                      {ch.error_count || 0}
                    </td>

                    <td className="py-2.5 px-2.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleScrapeChannel(ch.handle)}
                        title="Trigger manual scrape"
                        className="px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-section-alt)] border border-[var(--border-strong)] text-[var(--accent)] hover:opacity-80"
                      >
                        Scrape Now
                      </button>

                      <button
                        onClick={() => handleToggleChannel(ch.handle, ch.is_enabled)}
                        className={`px-2 py-1 rounded border ${
                          ch.is_enabled
                            ? 'bg-[var(--bullish-bg)] text-[var(--bullish)] border-[var(--bullish-border)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                        }`}
                      >
                        {ch.is_enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        onClick={() => handleDeleteChannel(ch.handle)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--bearish)] hover:bg-[var(--bg-surface)] transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sources Registry */}
      {activeSubTab === 'sources' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] uppercase text-[10px]">
                <th className="py-2 px-2.5">Source Name</th>
                <th className="py-2 px-2.5">Type</th>
                <th className="py-2 px-2.5">Status</th>
                <th className="py-2 px-2.5">Interval</th>
                <th className="py-2 px-2.5">Last Success</th>
                <th className="py-2 px-2.5">Error Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {sources.map(src => (
                <tr key={src.id} className="hover:bg-[var(--bg-surface)] transition">
                  <td className="py-2.5 px-2.5">
                    <div className="font-bold text-[var(--text-primary)]">{src.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate max-w-xs">{src.endpoint_url}</div>
                  </td>
                  <td className="py-2.5 px-2.5 text-[var(--accent)] uppercase font-semibold">
                    {src.type}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      src.status === 'LIVE' ? 'bg-[var(--bullish-bg)] text-[var(--bullish)] border-[var(--bullish-border)]' :
                      src.status === 'DELAYED' ? 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]' :
                      'bg-[var(--bearish-bg)] text-[var(--bearish)] border-[var(--bearish-border)]'
                    }`}>
                      {src.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">
                    {src.interval_seconds}s
                  </td>
                  <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">
                    {src.last_success_at ? new Date(src.last_success_at).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="py-2.5 px-2.5 text-[var(--text-secondary)] font-bold">
                    {src.error_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Deduplication Inspector */}
      {activeSubTab === 'duplicates' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
            <span>ONE EVENT → ONE EVENT ID CONSOLIDATION AUDIT</span>
            <span>Total Consolidated Events: {duplicates.length}</span>
          </div>

          <div className="space-y-3">
            {duplicates.map(dup => (
              <div key={dup.event_id} className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-2 font-mono text-xs">
                  <span className="font-bold text-[var(--accent)]">EVENT ID: {dup.event_id}</span>
                  <span className="text-[var(--bullish)] bg-[var(--bullish-bg)] px-2 py-0.5 rounded border border-[var(--bullish-border)]">
                    {dup.source_count} Sources Merged ({(dup.languages || []).join(', ')})
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[var(--text-primary)] mb-2">{dup.title}</h3>

                <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Merged Original Articles:</span>
                  {dup.sources.map((s: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
                      <div className="flex items-center justify-between font-mono text-[10px] text-[var(--text-secondary)] mb-0.5">
                        <span className="text-[var(--accent)] font-bold">{s.source_name} ({s.language})</span>
                        <span>Match Confidence: {(s.similarity_score * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-[var(--text-secondary)] font-medium">{s.original_title}</p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">Matched Reason: {s.matched_reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Live Deduplication Tester */}
      {activeSubTab === 'test' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <h3 className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">
              Inject Test Headline to Verify Real-Time Deduplication
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
              Test with cross-lingual headlines (e.g. Try: "Inflasi AS naik 3,1% YoY" to see it merge into the existing "US CPI rises 3.1% YoY" event without creating a duplicate event!).
            </p>

            <form onSubmit={handleInjectTest} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[var(--text-secondary)] block mb-1">Headline / Title:</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="e.g. US inflation rose 3.1% YoY in the latest release"
                  required
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-[var(--text-secondary)] block mb-1">Article Content / Body:</label>
                <textarea
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  placeholder="e.g. The US consumer price index rose 3.1%, in line with consensus."
                  rows={2}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--text-secondary)] block mb-1">Language:</label>
                  <select
                    value={testLang}
                    onChange={(e) => setTestLang(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] outline-none"
                  >
                    <option value="en">English (en)</option>
                    <option value="id">Indonesian (id)</option>
                    <option value="es">Spanish (es)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] block mb-1">Source Name:</label>
                  <input
                    type="text"
                    value={testSource}
                    onChange={(e) => setTestSource(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 rounded text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] font-bold transition cursor-pointer"
              >
                Inject Article Through Pipeline
              </button>
            </form>
          </div>

          {testResult && (
            <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--accent)] space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--accent)]">PIPELINE EXECUTION OUTCOME:</span>
                <span className={`px-2 py-0.5 rounded font-bold border ${
                  testResult.isDuplicate
                    ? 'bg-[var(--bullish-bg)] text-[var(--bullish)] border-[var(--bullish-border)]'
                    : 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]'
                }`}>
                  {testResult.isDuplicate ? 'DEDUPLICATED (LINKED TO EXISTING EVENT)' : 'NEW CANONICAL EVENT CREATED'}
                </span>
              </div>
              <p className="text-[var(--text-secondary)]">
                <strong>Event ID:</strong> {testResult.event.id}
              </p>
              <p className="text-[var(--text-secondary)]">
                <strong>Event Title:</strong> {testResult.event.title}
              </p>
              <p className="text-[var(--text-secondary)]">
                <strong>Affected Assets:</strong> {(testResult.event.affected_assets || []).join(', ') || 'None'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Health & DB */}
      {activeSubTab === 'health' && health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] block text-[10px]">DATABASE STATUS</span>
            <span className="text-lg font-bold text-[var(--bullish)]">{health.db_status}</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">Single Source of Truth</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] block text-[10px]">TOTAL CANONICAL EVENTS</span>
            <span className="text-lg font-bold text-[var(--accent)]">{health.database_stats.events_count}</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">Deduplicated</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] block text-[10px]">TOTAL NEWS WIRES INGESTED</span>
            <span className="text-lg font-bold text-[var(--accent)]">{health.database_stats.news_count}</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">Linked to Events</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] block text-[10px]">ACTIVE SSE CONNECTIONS</span>
            <span className="text-lg font-bold text-[var(--warning)]">{health.active_sse_connections}</span>
            <span className="text-[10px] text-[var(--text-muted)] block mt-1">Live Clients Streaming</span>
          </div>
        </div>
      )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  CheckCircle2,
  Zap,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Clock,
  Radio,
  BarChart2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Building,
} from 'lucide-react';
import { User, SubscriptionPlan } from '../types';
import { api } from '../lib/api';
import { PLANS, PlanDefinition } from '../lib/plans';

export interface SubscriptionPlansProps {
  user?: User | null;
  onPlanUpdated?: (updatedUser: User) => void;
  onOpenAuth?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

interface PricingTier {
  id: SubscriptionPlan;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  popular?: boolean;
  accentColor: 'slate' | 'cyan' | 'purple';
  features: string[];
  exclusiveFeatures: string[];
  metrics: {
    streamSpeed: string;
    watchlists: string;
    aiReports: string;
    customFeeds: string;
  };
}

const TIERS: PricingTier[] = [
  {
    ...PLANS.FREE,
    metrics: {
      streamSpeed: 'Standard Polling',
      watchlists: '1 Local Watchlist',
      aiReports: 'Public Bulletins Only',
      customFeeds: 'None',
    },
  },
  {
    ...PLANS.PRO,
    metrics: {
      streamSpeed: '< 100ms Ultra-Low Latency',
      watchlists: 'Unlimited Cloud Sync',
      aiReports: 'Full Deep Analysis',
      customFeeds: 'Standard Telegram Channels',
    },
  },
  {
    ...PLANS.INSTITUTIONAL,
    metrics: {
      streamSpeed: 'Dedicated SLA Gateway',
      watchlists: 'Enterprise Multi-User',
      aiReports: 'Unlimited Gemini Live Insights',
      customFeeds: 'Full Control & Scraper Access',
    },
  },
];

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  user,
  onPlanUpdated,
  onOpenAuth,
  onClose,
  isModal = false,
}) => {
  const [updatingPlan, setUpdatingPlan] = useState<SubscriptionPlan | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Determine user's active plan
  const currentPlan: SubscriptionPlan = (user?.plan as SubscriptionPlan) || (user?.role === 'ADMIN' ? 'INSTITUTIONAL' : 'FREE');

  const handleSelectPlan = async (tierId: SubscriptionPlan) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // If user is not logged in, prompt authentication
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth();
      }
      return;
    }

    // If clicking current plan, no-op
    if (tierId === currentPlan) {
      return;
    }

    // Direct plan switch without payment requirements (Free for all tiers)
    try {
      setUpdatingPlan(tierId);
      const res = await api.updateSubscription(tierId);
      if (res.success && res.user) {
        const tierName = tierId === 'PRO' ? 'Trader Pro' : tierId === 'INSTITUTIONAL' ? 'Desk & Institutional' : 'Evaluation Tier';
        setSuccessMessage(`Berhasil mengaktifkan paket ${tierName}! Semua fitur terbuka tanpa biaya.`);
        if (onPlanUpdated) {
          onPlanUpdated(res.user);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengubah paket. Silakan coba lagi.');
    } finally {
      setUpdatingPlan(null);
    }
  };

  return (
    <div className={`w-full ${isModal ? 'max-w-5xl mx-auto' : 'max-w-6xl mx-auto py-8 px-4 sm:px-6'}`}>
      {/* Header / Intro */}
      <div className="relative mb-8 text-center">
        {isModal && onClose && (
          <button
            onClick={onClose}
            aria-label="Close subscription plans modal"
            className="absolute -top-2 right-0 p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-3">
          <Zap className="w-3.5 h-3.5" />
          Institutional Market Access
        </div>
        
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Select Your Surveillance Tier
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
          Akses penuh ke semua analisis makro, sentimen bank sentral, streaming sub-detik, dan data inteligensi pasar secara <span className="text-emerald-400 font-semibold">100% Gratis</span> tanpa biaya atau kartu kredit.
        </p>

        {/* Current User Plan Banner if Logged In */}
        {user && (
          <div className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Authenticated as: <strong className="text-slate-200">{user.name || user.email}</strong>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <span className="flex items-center gap-1.5">
              Active Plan:
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                currentPlan === 'INSTITUTIONAL'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : currentPlan === 'PRO'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {currentPlan}
              </span>
            </span>
          </div>
        )}

        {/* Success or Error Notifications */}
        {successMessage && (
          <div className="mt-4 max-w-md mx-auto p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 max-w-md mx-auto p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Free Platform Notice */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Platform Gratis: Seluruh tingkatan dapat diaktifkan secara bebas oleh setiap pengguna terdaftar.</span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
        {TIERS.map((tier) => {
          const isCurrent = user ? currentPlan === tier.id : false;
          const isUpgrading = updatingPlan === tier.id;

          return (
            <div
              key={tier.id}
              className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                tier.popular
                  ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-500 shadow-xl shadow-cyan-500/10'
                  : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
              } ${isCurrent ? 'ring-2 ring-emerald-500/50' : ''}`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase shadow-md shadow-cyan-500/30">
                  {tier.badge}
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-md shadow-emerald-500/30">
                  <Check className="w-3 h-3 stroke-[3]" />
                  CURRENT PLAN
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase tracking-wider font-bold ${
                    tier.accentColor === 'cyan'
                      ? 'text-cyan-400'
                      : tier.accentColor === 'purple'
                      ? 'text-purple-400'
                      : 'text-slate-400'
                  }`}>
                    {tier.tagline}
                  </span>
                </div>

                <div className="text-2xl font-bold text-slate-100 mt-1 font-sans">
                  {tier.name}
                </div>

                {/* Price Display with IDR and USD */}
                <div className="mt-4">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-100 font-sans tracking-tight">
                      Rp 0
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">
                      / GRATIS (Free Access)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" /> Akses Penuh Tanpa Biaya
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-sans mt-3 leading-relaxed min-h-[38px]">
                  {tier.description}
                </p>

                {/* Spec Telemetry Badges */}
                <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono">
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase">Stream Speed</div>
                    <div className="text-slate-200 font-bold truncate">{tier.metrics.streamSpeed}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px] uppercase">Watchlists</div>
                    <div className="text-slate-200 font-bold truncate">{tier.metrics.watchlists}</div>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="mt-6 space-y-2.5 text-xs text-slate-300 font-sans">
                  <div className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider mb-1">
                    Features Included:
                  </div>
                  {tier.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          tier.accentColor === 'cyan'
                            ? 'text-cyan-400'
                            : tier.accentColor === 'purple'
                            ? 'text-purple-400'
                            : 'text-emerald-400'
                        }`}
                      />
                      <span className="leading-snug text-slate-200">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-slate-800/80">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs font-bold font-sans flex items-center justify-center gap-2 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Active Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(tier.id)}
                    disabled={isUpgrading}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-2 cursor-pointer ${
                      tier.popular
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                        : tier.id === 'INSTITUTIONAL'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    } disabled:opacity-50`}
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating Plan...
                      </>
                    ) : !user ? (
                      <>
                        {tier.id === 'FREE' ? 'Get Started Free' : `Get Started with ${tier.name}`}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        {currentPlan === 'INSTITUTIONAL' && tier.id !== 'INSTITUTIONAL'
                          ? `Downgrade to ${tier.name}`
                          : `Switch to ${tier.name}`}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}

                <div className="text-center mt-2.5 text-[10px] text-slate-500 font-sans">
                  Akses 100% Gratis • Tanpa Kartu Kredit atau Biaya
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Toggle */}
      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={() => setShowComparison(!showComparison)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-850 transition cursor-pointer"
        >
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          {showComparison ? 'Hide Feature Comparison' : 'View Full Feature Comparison Table'}
        </button>
      </div>

      {/* Detailed Feature Comparison Table */}
      {showComparison && (
        <div className="mt-8 rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden font-sans text-xs">
          <div className="p-4 bg-slate-950 border-b border-slate-800 font-mono font-bold text-slate-200 flex items-center justify-between">
            <span>Granular Capability Breakdown</span>
            <span className="text-xs text-emerald-400 font-normal">Semua Fitur Terbuka Bebas</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400">
                  <th className="py-3 px-4">Feature / Protocol</th>
                  <th className="py-3 px-4 text-center text-slate-200">Evaluation (Free)</th>
                  <th className="py-3 px-4 text-center text-cyan-400 font-bold">Trader Pro (Free)</th>
                  <th className="py-3 px-4 text-center text-purple-400 font-bold">Institutional (Free)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-sans">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">Data Stream Protocol</td>
                  <td className="py-3 px-4 text-center text-slate-400">Polling (15s)</td>
                  <td className="py-3 px-4 text-center text-cyan-300 font-bold">Low-latency SSE</td>
                  <td className="py-3 px-4 text-center text-purple-300 font-bold">Dedicated SSE Gateway</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">Intraday Bias Radar</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-cyan-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">G8 Currency Strength Matrix</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-cyan-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">Economic Calendar Surprises</td>
                  <td className="py-3 px-4 text-center text-slate-400">Standard Data</td>
                  <td className="py-3 px-4 text-center text-cyan-300 font-bold">Instant Beat/Miss Engine</td>
                  <td className="py-3 px-4 text-center text-purple-300 font-bold">Deep Deviation & Reaction</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">AI Macro Driver Synthesis</td>
                  <td className="py-3 px-4 text-center text-slate-500"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-cyan-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">Persistent Cloud Watchlists</td>
                  <td className="py-3 px-4 text-center text-slate-400">1 Local Session</td>
                  <td className="py-3 px-4 text-center text-cyan-300 font-bold">Unlimited Cloud Sync</td>
                  <td className="py-3 px-4 text-center text-purple-300 font-bold">Team Shared Watchlists</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">Central Bank Speech Parser</td>
                  <td className="py-3 px-4 text-center text-slate-500"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-cyan-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">Telegram Channel Scraping Control</td>
                  <td className="py-3 px-4 text-center text-slate-500"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-slate-500"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-purple-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-200">Database & Pipeline Administration</td>
                  <td className="py-3 px-4 text-center text-slate-500"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-slate-500"><X className="w-4 h-4 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-purple-400 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trust & FAQ Footer */}
      <div className="mt-12 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-4">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          Subscription & Ingestion Questions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <h4 className="font-semibold text-slate-200 mb-1 font-sans">Can I upgrade or downgrade at any time?</h4>
            <p className="leading-relaxed">
              Yes, plan adjustments are applied immediately to your active terminal profile without interrupting live telemetry feeds.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 mb-1 font-sans">How does the Telegram scraper work?</h4>
            <p className="leading-relaxed">
              Institutional subscribers can add custom public Telegram channels to scrape breaking macroeconomic headlines and central bank commentary directly into our deduplication pipeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

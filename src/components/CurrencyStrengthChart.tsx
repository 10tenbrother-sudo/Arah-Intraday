import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CurrencyStrength } from '../types';
import { api } from '../lib/api';
import { RefreshCw, TrendingUp, Sparkles, ExternalLink, Calendar, SlidersHorizontal } from 'lucide-react';

export const CURRENCY_COLORS: Record<string, { hex: string; bg: string; text: string; border: string; name: string }> = {
  USD: { hex: '#ff9900', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', name: 'US Dollar' },
  EUR: { hex: '#ff0000', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', name: 'Euro' },
  JPY: { hex: '#00ccff', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', name: 'Japanese Yen' },
  GBP: { hex: '#00cc00', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', name: 'British Pound' },
  AUD: { hex: '#0033ff', bg: 'bg-blue-600/10', text: 'text-blue-400', border: 'border-blue-500/30', name: 'Australian Dollar' },
  CHF: { hex: '#996600', bg: 'bg-yellow-800/15', text: 'text-amber-600', border: 'border-amber-700/30', name: 'Swiss Franc' },
  CAD: { hex: '#9900ff', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', name: 'Canadian Dollar' },
  NZD: { hex: '#ff33cc', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30', name: 'New Zealand Dollar' },
};

export const G8_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'];

interface CurrencyStrengthChartProps {
  strengths?: CurrencyStrength[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onSelectCurrency?: (currency: string) => void;
}

interface RawChartSeries {
  key: string;
  values: [number, number][]; // [timestampMs, deltaValue]
}

export const CurrencyStrengthChart: React.FC<CurrencyStrengthChartProps> = React.memo(({
  strengths = [],
  onRefresh,
  isRefreshing: externalRefreshing = false,
  onSelectCurrency,
}) => {
  const [range, setRange] = useState<'1d' | '2d'>('1d');
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(
    new Set(G8_CURRENCIES)
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredCurrency, setHoveredCurrency] = useState<string | null>(null);
  const [chartSeries, setChartSeries] = useState<RawChartSeries[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch real-time chart feed from server proxy
  const loadChartData = async (selectedRange: '1d' | '2d') => {
    try {
      setIsLoading(true);
      const res = await api.getCurrencyChartFeed(selectedRange);
      if (res.series && res.series.length > 0) {
        setChartSeries(res.series);
        setLastUpdated(res.timestamp || new Date().toISOString());
      }
    } catch (err) {
      console.warn('[CurrencyStrengthChart] Feed fetch notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChartData(range);
    // 30 seconds auto-refresh interval (matching currency-strength.com update cadence)
    const interval = setInterval(() => {
      loadChartData(range);
    }, 30000);
    return () => clearInterval(interval);
  }, [range]);

  const handleManualRefresh = () => {
    loadChartData(range);
    if (onRefresh) onRefresh();
  };

  // Pre-process timelines & scales
  const chartData = useMemo(() => {
    if (!chartSeries || chartSeries.length === 0) {
      return null;
    }

    // Reference timeline from USD or the series with the most points
    const primarySeries = chartSeries.find(s => s.key.toUpperCase() === 'USD') || chartSeries[0];
    if (!primarySeries || !primarySeries.values || primarySeries.values.length === 0) {
      return null;
    }

    const timestamps = primarySeries.values.map(v => v[0]);
    const pointCount = timestamps.length;

    // Currency values map indexed by timestamp index
    const valuesByCurrency: Record<string, number[]> = {};
    let minVal = -2;
    let maxVal = 2;

    chartSeries.forEach(s => {
      const curKey = s.key.toUpperCase();
      const vals = s.values.map(v => Number(v[1]));
      valuesByCurrency[curKey] = vals;

      vals.forEach(v => {
        if (!isNaN(v)) {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      });
    });

    // Expand min/max slightly for visual breathing room and ensure 0 baseline is centered/visible
    const absMax = Math.max(Math.abs(minVal), Math.abs(maxVal));
    const yMargin = Math.max(2, Math.ceil(absMax * 1.15));
    const domainY: [number, number] = [-yMargin, yMargin];

    // Latest live values
    const latestValues: Record<string, number> = {};
    chartSeries.forEach(s => {
      const curKey = s.key.toUpperCase();
      const vals = valuesByCurrency[curKey];
      if (vals && vals.length > 0) {
        latestValues[curKey] = vals[vals.length - 1];
      }
    });

    return {
      timestamps,
      pointCount,
      valuesByCurrency,
      domainY,
      latestValues,
    };
  }, [chartSeries]);

  // Dimensions
  const width = 760;
  const height = 330;
  const padding = { top: 25, right: 52, bottom: 35, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Coordinate mappers
  const getY = (val: number, domain: [number, number]) => {
    const [min, max] = domain;
    const clamped = Math.max(min, Math.min(max, val));
    const rangeY = max - min;
    if (rangeY === 0) return padding.top + chartHeight / 2;
    return padding.top + chartHeight - ((clamped - min) / rangeY) * chartHeight;
  };

  const getX = (idx: number, total: number) => {
    if (total <= 1) return padding.left;
    return padding.left + (idx / (total - 1)) * chartWidth;
  };

  // Build SVG smooth bezier path
  const buildSmoothPath = (values: number[], domain: [number, number]) => {
    if (!values || values.length === 0) return '';
    const points = values.map((val, idx) => ({
      x: getX(idx, values.length),
      y: getY(val, domain),
    }));

    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
    return d;
  };

  // Toggle currency
  const toggleCurrency = (cur: string) => {
    setSelectedCurrencies(prev => {
      const next = new Set(prev);
      if (next.has(cur)) {
        if (next.size > 1) next.delete(cur);
      } else {
        next.add(cur);
      }
      return next;
    });
  };

  // Isolate currency
  const isolateCurrency = (cur: string) => {
    if (selectedCurrencies.size === 1 && selectedCurrencies.has(cur)) {
      setSelectedCurrencies(new Set(G8_CURRENCIES));
    } else {
      setSelectedCurrencies(new Set([cur]));
    }
  };

  const selectAll = () => setSelectedCurrencies(new Set(G8_CURRENCIES));

  // Tooltip & Active point inspection
  const activeIdx = hoveredIndex !== null
    ? hoveredIndex
    : chartData?.pointCount ? chartData.pointCount - 1 : null;

  const activeTimestamp = activeIdx !== null && chartData ? chartData.timestamps[activeIdx] : null;

  // Sorted currencies at active point
  const sortedAtPoint = useMemo(() => {
    if (!chartData || activeIdx === null) return [];
    const list: { currency: string; val: number }[] = [];
    G8_CURRENCIES.forEach(cur => {
      const vals = chartData.valuesByCurrency[cur];
      if (vals && vals[activeIdx] !== undefined) {
        list.push({ currency: cur, val: vals[activeIdx] });
      }
    });
    list.sort((a, b) => b.val - a.val);
    return list;
  }, [chartData, activeIdx]);

  // Generate clean Y-ticks
  const yTicks = useMemo(() => {
    if (!chartData) return [];
    const [min, max] = chartData.domainY;
    const step = max > 14 ? 4 : max > 8 ? 2 : 1;
    const ticks: number[] = [0];

    for (let t = step; t <= max; t += step) {
      ticks.push(t);
    }
    for (let t = -step; t >= min; t -= step) {
      ticks.push(t);
    }
    return ticks.sort((a, b) => b - a);
  }, [chartData]);

  // Generate clean X-ticks
  const xTicks = useMemo(() => {
    if (!chartData || chartData.timestamps.length === 0) return [];
    const ts = chartData.timestamps;
    const count = ts.length;

    // Pick 5 to 7 evenly spaced timestamps
    const numTicks = range === '1d' ? 6 : 8;
    const step = Math.max(1, Math.floor((count - 1) / (numTicks - 1)));
    const result: { idx: number; timestamp: number; label: string }[] = [];

    for (let i = 0; i < count; i += step) {
      const t = ts[i];
      const d = new Date(t);
      const timeStr = d.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const dayStr = d.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
      });

      result.push({
        idx: i,
        timestamp: t,
        label: range === '2d' ? `${dayStr} ${timeStr}` : `${timeStr}`,
      });
    }

    // Always include the final point if not already
    if (result[result.length - 1]?.idx !== count - 1) {
      const lastT = ts[count - 1];
      const lastD = new Date(lastT);
      result.push({
        idx: count - 1,
        timestamp: lastT,
        label: range === '2d'
          ? `${lastD.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' })} ${lastD.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })}`
          : `${lastD.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })}`,
      });
    }

    return result;
  }, [chartData, range]);

  return (
    <div className="flex flex-col h-full space-y-2.5 font-mono" ref={containerRef}>
      {/* Top Toolbar - Range Switcher (Today / Yesterday) & Live Source Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
              CURRENCY STRENGTH CHART
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Open Parity 04:00 WIB</span>
          </div>
        </div>

        {/* Range Selector: Today (1 Day) vs Yesterday (2 Days) - Exactly like currency-strength.com */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
            <button
              onClick={() => setRange('2d')}
              className={`px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                range === '2d'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View past 48 hours (yesterday + today)"
            >
              yesterday (2D)
            </button>
            <button
              onClick={() => setRange('1d')}
              className={`px-2.5 py-1 rounded transition cursor-pointer font-semibold ${
                range === '1d'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="View current trading session from 04:00 WIB open"
            >
              today (1D)
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isLoading || externalRefreshing}
            title="Refresh Live Chart Data"
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading || externalRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Official 8-Currency Badges & Filters (With exact website hex colors) */}
      <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5 border-t border-slate-800/40">
        <div className="flex items-center gap-1.5 flex-wrap">
          {G8_CURRENCIES.map(cur => {
            const isSelected = selectedCurrencies.has(cur);
            const isHovered = hoveredCurrency === cur;
            const style = CURRENCY_COLORS[cur];
            const liveDelta = chartData?.latestValues[cur];

            return (
              <button
                key={cur}
                onClick={() => toggleCurrency(cur)}
                onDoubleClick={() => isolateCurrency(cur)}
                onMouseEnter={() => setHoveredCurrency(cur)}
                onMouseLeave={() => setHoveredCurrency(null)}
                title={`Klik untuk toggle, double-klik untuk fokus hanya ke ${cur}`}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? `${style.bg} ${style.text} ${style.border} ${isHovered ? 'ring-1 ring-white/40' : ''}`
                    : 'bg-slate-950/60 text-slate-600 border-slate-800/80 line-through opacity-50'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shadow-xs"
                  style={{ backgroundColor: style.hex }}
                />
                <span className="font-bold">{cur}</span>
                {liveDelta !== undefined && (
                  <span
                    className={`text-[9px] tabular-nums ${
                      liveDelta > 0 ? 'text-emerald-400' : liveDelta < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {liveDelta > 0 ? `+${liveDelta.toFixed(1)}` : liveDelta.toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={selectAll}
          className="text-[9px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800"
        >
          All (8)
        </button>
      </div>

      {/* SVG Multi-Line Chart Canvas */}
      <div className="relative w-full bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden shadow-inner">
        {isLoading && !chartData && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Memuat data grafik dari currency-strength.com...</span>
            </div>
          </div>
        )}

        {chartData && (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              {/* Subtle background gradients for positive vs negative territory */}
              <linearGradient id="positiveTerritory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="negativeTerritory" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Zero Baseline (Center Equilibrium) */}
            {chartData && (
              <>
                {/* Positive (Strengthening) Background Box */}
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={chartWidth}
                  height={getY(0, chartData.domainY) - padding.top}
                  fill="url(#positiveTerritory)"
                />
                {/* Negative (Weakening) Background Box */}
                <rect
                  x={padding.left}
                  y={getY(0, chartData.domainY)}
                  width={chartWidth}
                  height={padding.top + chartHeight - getY(0, chartData.domainY)}
                  fill="url(#negativeTerritory)"
                />
              </>
            )}

            {/* Horizontal Grid Lines */}
            {yTicks.map(t => {
              const y = getY(t, chartData.domainY);
              const isZero = t === 0;

              return (
                <g key={`y-${t}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + chartWidth}
                    y2={y}
                    stroke={isZero ? '#94a3b8' : '#1e293b'}
                    strokeWidth={isZero ? 1.5 : 0.8}
                    strokeDasharray={isZero ? undefined : '2 3'}
                    strokeOpacity={isZero ? 0.7 : 0.4}
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    fill={isZero ? '#f8fafc' : '#64748b'}
                    fontSize={isZero ? '9' : '8'}
                    fontWeight={isZero ? 'bold' : 'normal'}
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {t > 0 ? `+${t}` : t}
                  </text>
                  {isZero && (
                    <text
                      x={padding.left + chartWidth + 4}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="7"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      0.0 (OPEN)
                    </text>
                  )}
                </g>
              );
            })}

            {/* Vertical Time Grid Lines */}
            {xTicks.map(t => {
              const x = getX(t.idx, chartData.pointCount);

              return (
                <g key={`x-${t.idx}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                    strokeDasharray="2 3"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={x}
                    y={padding.top + chartHeight + 16}
                    fill="#64748b"
                    fontSize="8"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {t.label}
                  </text>
                </g>
              );
            })}

            {/* Currency Multi-Line Paths */}
            {G8_CURRENCIES.map(cur => {
              if (!selectedCurrencies.has(cur)) return null;
              const vals = chartData.valuesByCurrency[cur];
              if (!vals || vals.length === 0) return null;

              const style = CURRENCY_COLORS[cur];
              const isHovered = hoveredCurrency === cur;
              const pathStr = buildSmoothPath(vals, chartData.domainY);

              const lastIdx = vals.length - 1;
              const lastX = getX(lastIdx, chartData.pointCount);
              const lastY = getY(vals[lastIdx], chartData.domainY);

              return (
                <g key={cur} className="transition-opacity duration-150">
                  {/* Subtle hover blur glow */}
                  {isHovered && (
                    <path
                      d={pathStr}
                      fill="none"
                      stroke={style.hex}
                      strokeWidth="5"
                      strokeOpacity="0.3"
                    />
                  )}

                  {/* Main Line */}
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={style.hex}
                    strokeWidth={isHovered ? 2.5 : 1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={hoveredCurrency && !isHovered ? 0.35 : 1}
                  />

                  {/* End node circle */}
                  <circle
                    cx={lastX}
                    cy={lastY}
                    r={isHovered ? 4 : 2.5}
                    fill={style.hex}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />

                  {/* End Label Tag */}
                  <text
                    x={lastX + 6}
                    y={lastY + 3}
                    fill={style.hex}
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                    opacity={hoveredCurrency && !isHovered ? 0.35 : 1}
                  >
                    {cur}
                  </text>
                </g>
              );
            })}

            {/* Hover Vertical Guideline (Crosshair) */}
            {hoveredIndex !== null && (
              <g>
                <line
                  x1={getX(hoveredIndex, chartData.pointCount)}
                  y1={padding.top}
                  x2={getX(hoveredIndex, chartData.pointCount)}
                  y2={padding.top + chartHeight}
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />
              </g>
            )}

            {/* Hit-detection columns */}
            {chartData.timestamps.map((t, idx) => {
              const x = getX(idx, chartData.pointCount);
              const colWidth = chartWidth / chartData.pointCount;

              return (
                <rect
                  key={`hit-${idx}`}
                  x={x - colWidth / 2}
                  y={padding.top}
                  width={colWidth}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>
        )}

        {/* Live Hover Tooltip Display (Shows All 8 Currencies Sorted by Delta at That Exact Time) */}
        {activeTimestamp && sortedAtPoint.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3 h-3 text-amber-400" />
              <span>TIME:</span>
              <span className="text-amber-300 font-bold">
                {new Date(activeTimestamp).toLocaleDateString('id-ID', {
                  timeZone: 'Asia/Jakarta',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                {new Date(activeTimestamp).toLocaleTimeString('id-ID', {
                  timeZone: 'Asia/Jakarta',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}{' '}
                WIB
              </span>
            </div>

            {/* Sorted currencies pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {sortedAtPoint
                .filter(item => selectedCurrencies.has(item.currency))
                .map(item => {
                  const style = CURRENCY_COLORS[item.currency];
                  const val = item.val;
                  return (
                    <div
                      key={item.currency}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: style?.hex || '#94a3b8' }}
                      />
                      <span className="font-bold text-slate-200">{item.currency}</span>
                      <span
                        className={`font-bold tabular-nums ${
                          val > 0
                            ? 'text-emerald-400'
                            : val < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Market Divergence Insight Card */}
      {sortedAtPoint.length >= 2 && (
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-300">
              <strong>Mata Uang Terkuat:</strong>{' '}
              <span className="text-emerald-400 font-bold">{sortedAtPoint[0]?.currency}</span> ({sortedAtPoint[0]?.val > 0 ? `+${sortedAtPoint[0]?.val.toFixed(2)}` : sortedAtPoint[0]?.val.toFixed(2)}) &bull;{' '}
              <strong>Terlemah:</strong>{' '}
              <span className="text-rose-400 font-bold">{sortedAtPoint[sortedAtPoint.length - 1]?.currency}</span> ({sortedAtPoint[sortedAtPoint.length - 1]?.val.toFixed(2)})
            </span>
          </div>

          <div className="text-amber-400 font-bold hidden sm:flex items-center gap-1">
            <span>Divergensi Pair ({sortedAtPoint[0]?.currency}/{sortedAtPoint[sortedAtPoint.length - 1]?.currency}):</span>
            <span className="text-slate-100 tabular-nums">
              +{(sortedAtPoint[0]?.val - sortedAtPoint[sortedAtPoint.length - 1]?.val).toFixed(2)} pt
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

CurrencyStrengthChart.displayName = 'CurrencyStrengthChart';

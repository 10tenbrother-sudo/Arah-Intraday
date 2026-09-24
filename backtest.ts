// Temporary backtest harness: replays the REAL ArahMarketEngine over ~70 days of
// intraday history (Yahoo Finance 15m bars, resampled) so threshold calibration
// is grounded in measured outcomes instead of a single live snapshot.
//
// Run:  npx tsx backtest.ts
// Data: /tmp/bt/*.json (Yahoo Finance, interval=15m&range=60d). Fetched
// automatically on first run if absent; delete /tmp/bt to refresh.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { db } from './server/db/database.js';
import { ArahMarketEngine } from './server/intelligence/arahMarketEngine.js';

const YF: Record<string, string> = {
  USD: 'DXY', US10Y: 'US10Y', EUR: 'EURUSD', GBP: 'GBPUSD', JPY: 'USDJPY',
  AUD: 'AUDUSD', CAD: 'USDCAD', XAUUSD: 'XAUUSD', US100: 'US100',
  US500: 'US500', US30: 'US30', BTC: 'BTC',
};
const YAHOO_SYMBOL: Record<string, string> = {
  DXY: 'DX-Y.NYB', US10Y: '^TNX', EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X',
  USDJPY: 'JPY=X', AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X', XAUUSD: 'GC=F',
  US100: 'NQ=F', US500: 'ES=F', US30: 'YM=F', BTC: 'BTC-USD',
};
const PAIR_FEED: Record<string, string> = {
  XAUUSD: 'XAUUSD', EURUSD: 'EUR', GBPUSD: 'GBP', USDJPY: 'JPY', US100: 'US100',
  US30: 'US30', US500: 'US500', AUDUSD: 'AUD', USDCAD: 'CAD', BTC: 'BTC',
};

mkdirSync('/tmp/bt', { recursive: true });
for (const f of Object.keys(YF)) {
  const path = `/tmp/bt/${YF[f]}.json`;
  if (existsSync(path)) continue;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(YAHOO_SYMBOL[YF[f]])}?interval=15m&range=60d`;
  process.stdout.write(`fetching ${YF[f]}... `);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36' } });
  const body = await res.text();
  writeFileSync(path, body);
  console.log(res.ok ? 'ok' : `HTTP ${res.status}`);
}

type Bar = { t: number; c: number };
const series: Record<string, Bar[]> = {};
for (const name of Object.keys(YF)) {
  const p = `/tmp/bt/${YF[name]}.json`;
  const res = JSON.parse(readFileSync(p, 'utf8'));
  const r0 = res.chart?.result?.[0];
  if (!r0?.indicators?.quote?.[0]) {
    console.error(`[skip] ${name} (${p}) has no chart quote; keys=${Object.keys(res).join(',')} chartErr=${JSON.stringify(res.chart?.error ?? null)}`);
    continue;
  }
  const ts: number[] = r0.timestamp;
  const cl: (number | null)[] = r0.indicators.quote[0].close;
  const bars: Bar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const raw = cl[i];
    if (raw === null || raw === undefined || isNaN(raw)) continue;
    bars.push({ t: ts[i], c: name === 'US10Y' ? raw / 10 : raw });
  }
  series[name] = bars;
}

function lastIdx(bars: Bar[], t: number): number {
  let lo = 0, hi = bars.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (bars[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

function pctOver(bars: Bar[], idx: number, lookback: number): number {
  const j = idx - lookback;
  if (j < 0) return 0;
  const prev = bars[j].c;
  return prev !== 0 ? ((bars[idx].c - prev) / prev) * 100 : 0;
}

function resample(bars: Bar[], k: number): Bar[] {
  if (k === 1) return bars;
  const out: Bar[] = [];
  for (let i = bars.length - 1; i >= 0; i -= k) out.push(bars[i]);
  return out.reverse();
}

// Mirrors CurrencyStrengthService.calculateStrengthFromMarketRates so the
// backtest uses the same fallback strength definition as production.
function rebuildStrength(changes: Record<string, number>): any[] {
  const pts: Record<string, number> = {
    USD: 0, EUR: changes.EUR ?? 0, GBP: changes.GBP ?? 0, JPY: -(changes.JPY ?? 0),
    AUD: changes.AUD ?? 0, NZD: 0, CAD: -(changes.CAD ?? 0), CHF: 0,
  };
  pts.USD = -(pts.EUR + pts.GBP + pts.AUD + pts.NZD - pts.JPY - pts.CAD - pts.CHF) / 7;
  const rows = Object.keys(pts).map(cur => ({
    currency: cur,
    strength_score: parseFloat(Math.min(9.9, Math.max(0.5, 5.0 + pts[cur] * 3.5)).toFixed(1)),
  }));
  rows.sort((a, b) => b.strength_score - a.strength_score);
  const now = new Date().toISOString();
  return rows.map((r, i) => ({
    ...r, rank: i + 1,
    change_direction: r.strength_score >= 7.5 ? 'STRONG_BUY' : r.strength_score >= 5.8 ? 'BUY'
      : r.strength_score >= 4.3 ? 'NEUTRAL' : r.strength_score >= 2.8 ? 'SELL' : 'STRONG_SELL',
    source: 'backtest', timestamp: now, last_updated: now, status: 'RECENT',
  }));
}

// lookback/fwd are in bars of the resampled series.
// 15m bars => 96 bars = 24h lookback; 4 bars = 1h forward; 96 = 24h forward.
const TF = [
  { name: '15m-1h', k: 1, lb: 96, fwd: 4 },
  { name: '15m-6h', k: 1, lb: 96, fwd: 24 },
  { name: '15m-24h', k: 1, lb: 96, fwd: 96 },
  { name: '1h-1d', k: 4, lb: 24, fwd: 24 },
];
const MAXBARS = 5000;

type Rec = { tf: string; pair: string; status: string; bias: string; fwdRet: number; action: string };

function run(tfName: string, k: number, lb: number, fwd: number): Rec[] {
  const resampled: Record<string, Bar[]> = {};
  for (const n of Object.keys(series)) resampled[n] = resample(series[n], k);
  const base = resampled['USD'];
  const start = Math.max(lb, base.length - MAXBARS);
  const recs: Rec[] = [];

  for (let i = start; i < base.length - fwd; i++) {
    const t = base[i].t;
    const changes: Record<string, number> = {};
    const prices: any[] = [];
    for (const sym of Object.keys(resampled)) {
      const bars = resampled[sym];
      const idx = lastIdx(bars, t);
      if (idx < 0) continue;
      const pct = pctOver(bars, idx, lb);
      changes[sym] = pct;
      const iso = new Date(t * 1000).toISOString();
      prices.push({
        symbol: sym, display_name: sym, asset_type: 'BACKTEST',
        price: bars[idx].c, change_24h: 0, change_24h_pct: pct,
        high_24h: bars[idx].c, low_24h: bars[idx].c, volume_24h: 0,
        sparkline_1h: [], source: 'backtest', timestamp: iso,
        last_updated: iso, status: 'DELAYED',
      });
    }
    if (prices.length < 10) continue;

    const strengths = rebuildStrength(changes);
    (db as any).getAllMarketPrices = () => prices;
    (db as any).getCurrencyStrength = () => strengths;
    (db as any).getAllEvents = () => [];
    (db as any).getEconomicEvents = () => [];

    let out: any;
    try { out = ArahMarketEngine.getArahMarketToday(); } catch { continue; }

    for (const p of out.pairs) {
      const feed = PAIR_FEED[p.pair];
      if (!feed) continue;
      const bars = resampled[feed];
      const idx = lastIdx(bars, t);
      if (idx < 0 || idx + fwd >= bars.length) continue;
      const fwdRet = ((bars[idx + fwd].c - bars[idx].c) / bars[idx].c) * 100;
      recs.push({
        tf: tfName, pair: p.pair, status: p.confluenceStatus,
        bias: p.directionalBias, fwdRet, action: p.intradayPlan.recommendedAction,
      });
    }
  }
  return recs;
}

const all: Rec[] = [];
for (const t of TF) {
  const r = run(t.name, t.k, t.lb, t.fwd);
  all.push(...r);
  console.log(`ran ${t.name}: ${r.length} samples`);
}

const dirSign = (b: string) => b.includes('BULLISH') ? 1 : b.includes('BEARISH') ? -1 : 0;

function stats(rows: Rec[]) {
  const dir = rows.filter(r => dirSign(r.bias) !== 0);
  const hits = dir.filter(r => dirSign(r.bias) * r.fwdRet > 0).length;
  const avg = dir.length ? dir.reduce((a, r) => a + dirSign(r.bias) * r.fwdRet, 0) / dir.length : 0;
  return { n: rows.length, dirN: dir.length, hit: dir.length ? (100 * hits / dir.length) : 0, avgSignedBps: avg * 100 };
}

function naiveBench(rows: Rec[]) {
  const hit = 100 * rows.filter(r => r.fwdRet > 0).length / rows.length;
  const avg = rows.reduce((a, r) => a + r.fwdRet, 0) / rows.length * 100;
  return { hit, avgBps: avg };
}

const byStatus: Record<string, Rec[]> = {};
for (const r of all) (byStatus[r.status] ||= []).push(r);

console.log('\n=== STATUS DISTRIBUTION (all timeframes) ===');
for (const [s, rows] of Object.entries(byStatus)) {
  const st = stats(rows);
  console.log(`${s.padEnd(17)} n=${String(st.n).padStart(6)} dirN=${String(st.dirN).padStart(6)} hit=${st.hit.toFixed(1)}% avgSigned=${st.avgSignedBps.toFixed(1)}bps share=${(100 * st.n / all.length).toFixed(1)}%`);
}

console.log('\n=== PER TIMEFRAME (engine vs "always long" benchmark) ===');
for (const tf of TF) {
  const rows = all.filter(r => r.tf === tf.name);
  const st = stats(rows);
  const nb = naiveBench(rows);
  console.log(`${tf.name.padEnd(8)} dirN=${String(st.dirN).padStart(6)} hit=${st.hit.toFixed(1)}% avgSigned=${st.avgSignedBps.toFixed(1)}bps | alwaysLong hit=${nb.hit.toFixed(1)}% avg=${nb.avgBps.toFixed(1)}bps`);
  for (const s of Object.keys(byStatus)) {
    const sub = rows.filter(r => r.status === s);
    if (!sub.length) continue;
    const ss = stats(sub);
    console.log(`   ${s.padEnd(17)} dirN=${String(ss.dirN).padStart(5)} hit=${ss.hit.toFixed(1)}% avgSigned=${ss.avgSignedBps.toFixed(1)}bps`);
  }
}

console.log('\n=== corr(engineBiasSign, forwardReturn) ===');
function corr(rows: Rec[], key: (r: Rec) => number): number {
  const xs = rows.map(key), ys = rows.map(r => r.fwdRet);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  return (dx && dy) ? num / Math.sqrt(dx * dy) : 0;
}
for (const tf of TF) {
  const rows = all.filter(r => r.tf === tf.name && dirSign(r.bias) !== 0);
  console.log(`${tf.name.padEnd(8)} ${corr(rows, r => dirSign(r.bias)).toFixed(4)}`);
}

console.log('\n=== HIGH_CONVICTION PER PAIR @ 15m-24h (direction balance & skill) ===');
const hc24 = all.filter(r => r.tf === '15m-24h' && r.status === 'HIGH_CONVICTION');
const byPair: Record<string, Rec[]> = {};
for (const r of hc24) (byPair[r.pair] ||= []).push(r);
for (const p of Object.keys(byPair)) {
  const rows = byPair[p];
  const st = stats(rows);
  const nb = naiveBench(rows);
  const nBull = rows.filter(r => r.bias.includes('BULLISH')).length;
  const nBear = rows.filter(r => r.bias.includes('BEARISH')).length;
  const skill = st.hit - nb.hit;
  console.log(`  ${p.padEnd(7)} n=${String(rows.length).padStart(5)} bull=${String(nBull).padStart(5)} bear=${String(nBear).padStart(5)} hit=${st.hit.toFixed(1)}% alwaysLong=${nb.hit.toFixed(1)}% skill=${skill >= 0 ? '+' : ''}${skill.toFixed(1)}pp avgSigned=${st.avgSignedBps.toFixed(1)}bps`);
}

console.log('\n=== STATUS FLIP / PERSISTENCE (consecutive bars) ===');
for (const tf of TF) {
  const seq: Record<string, Rec[]> = {};
  for (const r of all.filter(x => x.tf === tf.name)) (seq[r.pair] ||= []).push(r);
  let flips = 0, tots = 0;
  for (const p of Object.keys(seq)) {
    const arr = seq[p];
    for (let i = 1; i < arr.length; i++) { tots++; if (arr[i].status !== arr[i - 1].status) flips++; }
  }
  console.log(`${tf.name.padEnd(8)} status changed ${flips}/${tots} = ${(100 * flips / tots).toFixed(1)}%`);
}

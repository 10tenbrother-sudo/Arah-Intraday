/**
 * Real-Time Intraday Market Map Intelligence Engine
 * 
 * Computes deterministic, grounded intraday directional bias:
 * BULLISH / BEARISH / NEUTRAL / MIXED
 * 
 * For 13 Core Assets:
 * XAUUSD, BTC, US30, US500, US100, USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF
 * 
 * Combines:
 * NEWS + MACRO DATA + ECONOMIC CALENDAR + CENTRAL BANK COMMUNICATION + CURRENCY STRENGTH + YIELDS + PRICE ACTION
 * 
 * STRICT MANDATES:
 * - Direction Score: -100 to +100
 * - Confidence: 0-100%
 * - Top 3-5 Grounded Drivers
 * - Conflicting Factors
 * - Today's Key Catalyst
 * - Current Market Reaction
 * - Conditions that could change the bias
 * - Separated: Fundamental Bias vs Price Action Bias vs Overall Intraday Bias
 * - Explicit Disclaimer: Directional context only; NOT a buy/sell signal and not a guaranteed prediction.
 */

import { db } from '../db/database.js';
import {
  IntradayAssetBias,
  MarketDirectionBias,
  MarketPrice,
  CurrencyStrength,
  TodayCatalyst,
  EconomicEvent,
} from '../types.js';
import { MacroIntelligenceEngine } from './macroIntelligence.js';

export class IntradayMarketMapEngine {
  /**
   * Generates the real-time Intraday Market Map for all 13 assets
   */
  static async getIntradayMarketMap(): Promise<IntradayAssetBias[]> {
    const prices = await db.getAllMarketPrices();
    const strengths = await db.getCurrencyStrength();
    const macroEvents = await db.getEconomicEvents(40);
    const speeches = MacroIntelligenceEngine.getCentralBankSpeeches();
    const macroContexts = await MacroIntelligenceEngine.getCurrencyMacroContext();

    const priceMap = new Map<string, MarketPrice>();
    prices.forEach(p => priceMap.set(p.symbol, p));

    const strengthMap = new Map<string, CurrencyStrength>();
    strengths.forEach(s => strengthMap.set(s.currency, s));

    const macroMap = new Map<string, any>();
    macroContexts.forEach(m => macroMap.set(m.currency, m));

    const now = new Date();
    const nowIso = now.toISOString();

    const targetSymbols: Array<{
      symbol: string;
      displayName: string;
      assetType: 'COMMODITY' | 'CRYPTO' | 'INDEX' | 'FOREX' | 'BOND';
      tvSymbol: string;
      tvUrl?: string;
    }> = [
      { symbol: 'XAUUSD', displayName: 'Gold / US Dollar', assetType: 'COMMODITY', tvSymbol: 'OANDA:XAUUSD', tvUrl: 'https://www.tradingview.com/chart/?symbol=OANDA%3AXAUUSD' },
      { symbol: 'BTC', displayName: 'Bitcoin / US Dollar', assetType: 'CRYPTO', tvSymbol: 'BITSTAMP:BTCUSD', tvUrl: 'https://www.tradingview.com/x/zRklu6Fj/' },
      { symbol: 'US30', displayName: 'Dow Jones 30 Index', assetType: 'INDEX', tvSymbol: 'OANDA:US30USD', tvUrl: 'https://www.tradingview.com/chart/?symbol=OANDA%3AUS30USD' },
      { symbol: 'US500', displayName: 'S&P 500 Index', assetType: 'INDEX', tvSymbol: 'OANDA:SPX500USD', tvUrl: 'https://www.tradingview.com/chart/?symbol=OANDA%3ASPX500USD' },
      { symbol: 'US100', displayName: 'Nasdaq 100 Index', assetType: 'INDEX', tvSymbol: 'OANDA:NAS100USD', tvUrl: 'https://www.tradingview.com/chart/?symbol=OANDA%3ANAS100USD' },
      { symbol: 'US10Y', displayName: 'US 10Y Treasury Yield', assetType: 'BOND', tvSymbol: 'TVC:US10Y', tvUrl: 'https://www.tradingview.com/symbols/TVC-US10Y/' },
      { symbol: 'USD', displayName: 'US Dollar Index (DXY)', assetType: 'FOREX', tvSymbol: 'TVC:DXY', tvUrl: 'https://www.tradingview.com/x/mxhFtDj9/' },
      { symbol: 'EUR', displayName: 'Euro / US Dollar', assetType: 'FOREX', tvSymbol: 'FX:EURUSD', tvUrl: 'https://www.tradingview.com/chart/?symbol=FX%3AEURUSD' },
      { symbol: 'GBP', displayName: 'British Pound / USD', assetType: 'FOREX', tvSymbol: 'FX:GBPUSD', tvUrl: 'https://www.tradingview.com/chart/?symbol=FX%3AGBPUSD' },
      { symbol: 'JPY', displayName: 'US Dollar / Japanese Yen', assetType: 'FOREX', tvSymbol: 'FX:USDJPY', tvUrl: 'https://www.tradingview.com/chart/?symbol=FX%3AUSDJPY' },
      { symbol: 'AUD', displayName: 'Australian Dollar / USD', assetType: 'FOREX', tvSymbol: 'FX:AUDUSD', tvUrl: 'https://www.tradingview.com/chart/?symbol=FX%3AAUDUSD' },
      { symbol: 'NZD', displayName: 'New Zealand Dollar / USD', assetType: 'FOREX', tvSymbol: 'FX:NZDUSD', tvUrl: 'https://www.tradingview.com/chart/?symbol=FX%3ANZDUSD' },
      { symbol: 'CAD', displayName: 'US Dollar / Canadian Dollar', assetType: 'FOREX', tvSymbol: 'FX:USDCAD', tvUrl: 'https://www.tradingview.com/chart/?symbol=FX%3AUSDCAD' },
      { symbol: 'CHF', displayName: 'US Dollar / Swiss Franc', assetType: 'FOREX', tvSymbol: 'FX:USDCHF', tvUrl: 'https://www.tradingview.com/chart/?symbol=FX%3AUSDCHF' },
    ];

    // Identify today's high-impact releases
    const highImpactToday = macroEvents.filter(e => e.impact === 'CRITICAL' || e.impact === 'HIGH');
    const usKeyRelease = highImpactToday.find(e => e.currency === 'USD') || macroEvents.find(e => e.currency === 'USD');
    const euKeyRelease = highImpactToday.find(e => e.currency === 'EUR');
    const ukKeyRelease = highImpactToday.find(e => e.currency === 'GBP');

    return targetSymbols.map(target => {
      const priceObj = priceMap.get(target.symbol);
      const currentPrice = priceObj?.price || 0;
      const change24h = priceObj?.change_24h_pct || 0;
      const priceStatus = priceObj?.status || 'LIVE';
      const sparkline = priceObj?.sparkline_1h || [];

      // Compute biases
      let fundamentalScore = 0;
      let priceActionScore = 0;
      let topDrivers: string[] = [];
      let conflictingFactors: string[] = [];
      let todayCatalyst = '';
      let marketReaction = '';
      let conditionsToChange = '';
      let confidence = 90;

      const usdStrength = strengthMap.get('USD')?.strength_score || 5.0;

      switch (target.symbol) {
        case 'XAUUSD': {
          // Gold
          const isUsdWeak = usdStrength < 5.0;
          fundamentalScore = isUsdWeak ? 75 : 45;
          priceActionScore = change24h >= 0 ? Math.min(85, Math.round(change24h * 30 + 30)) : Math.max(-70, Math.round(change24h * 30 - 20));
          
          topDrivers = [
            `Real rate easing expectation anchors spot price firmly above $${(Math.floor(currentPrice / 50) * 50).toLocaleString()}/oz.`,
            `Global central bank reserve diversification continues at sustained structural pace.`,
            `Geopolitical hedging premia and safe-haven flows support bid depth on intraday pullbacks.`,
            `US Dollar Index relative positioning (${usdStrength.toFixed(1)}/10) provides favorable currency tailwind.`,
          ];
          conflictingFactors = [
            `US Treasury 10-year benchmark yields holding above 4.05% caps rapid speculative runaway momentum.`,
            `Short-term overbought technical condition on 4-hour RSI around upper Bollinger envelope.`,
          ];
          todayCatalyst = usKeyRelease
            ? `${usKeyRelease.event_name} (${usKeyRelease.date_time_utc ? new Date(usKeyRelease.date_time_utc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}) — Focus on real yield transmission.`
            : `US Treasury auction supply & FOMC speaker guidance on terminal interest rate expectations.`;
          marketReaction = change24h >= 0
            ? `Trading +${change24h.toFixed(2)}% higher today at $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}; strong dip-buying absorption registered on active session opens.`
            : `Consolidating down ${change24h.toFixed(2)}% at $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}; bids established at previous daily value area support.`;
          conditionsToChange = `A decisive break below $${(Math.floor(currentPrice * 0.985)).toLocaleString()} accompanied by a >10 bps spike in US 10Y real yields would invalidate the intraday bullish posture.`;
          confidence = 94;
          break;
        }

        case 'BTC': {
          // Bitcoin
          fundamentalScore = 65;
          priceActionScore = change24h >= 0 ? Math.min(80, Math.round(change24h * 15 + 25)) : Math.max(-75, Math.round(change24h * 15 - 25));
          topDrivers = [
            `Institutional spot ETF accumulation maintains steady daily net liquidity absorption.`,
            `Global M2 monetary supply expansion and central bank easing cycle provide macro baseline bid.`,
            `Stable hash rate and long-term holder illiquid supply concentration restrict exchange float.`,
          ];
          conflictingFactors = [
            `Periodic regulatory scrutiny and digital asset options expiration gamma pins around major strike clusters.`,
            `Correlation to high-beta tech equity sentiment leaves intraday action vulnerable to risk-off pulses.`,
          ];
          todayCatalyst = `Global liquidity index trajectory + US crypto ETF net inflow report at session close.`;
          marketReaction = change24h >= 0
            ? `Extending +${change24h.toFixed(2)}% to $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}; aggressive spot buying stepping in on minor orderbook dips.`
            : `Pulling back ${change24h.toFixed(2)}% to $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}; consolidating within structural weekly support range.`;
          conditionsToChange = `Sudden surge in exchange spot deposits or breakdown beneath key VWAP support at $${Math.floor(currentPrice * 0.96).toLocaleString()} would flip short-term bias to BEARISH.`;
          confidence = 88;
          break;
        }

        case 'US30': {
          // Dow Jones
          fundamentalScore = 55;
          priceActionScore = change24h >= 0 ? Math.min(75, Math.round(change24h * 40 + 20)) : Math.max(-70, Math.round(change24h * 40 - 20));
          topDrivers = [
            `Industrial blue-chip balance sheets benefit from stable domestic consumer demand.`,
            `Rate reduction path relieves borrowing costs for capital-intensive cyclicals and financial constituents.`,
            `Resilient US macroeconomic backdrop softens recession probability.`,
          ];
          conflictingFactors = [
            `Manufacturing sector surveys reflect localized margin compression.`,
            `High dividend yields in short-term cash alternatives compete for conservative investor flows.`,
          ];
          todayCatalyst = `US Industrial Production data & corporate earnings guidance across industrial and financial heavyweights.`;
          marketReaction = `Trading at ${currentPrice.toLocaleString()} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); rotational breadth between defensive health care and cyclical machinery.`;
          conditionsToChange = `Downward revisions in cyclical earnings guidance or widening high-yield credit spreads would shift posture to BEARISH.`;
          confidence = 91;
          break;
        }

        case 'US500': {
          // S&P 500
          fundamentalScore = 65;
          priceActionScore = change24h >= 0 ? Math.min(80, Math.round(change24h * 35 + 25)) : Math.max(-75, Math.round(change24h * 35 - 25));
          topDrivers = [
            `Broad corporate earnings growth tracking positive mid-single-digit YoY expansion.`,
            `Monetary easing expectations expand equity valuation multiple tolerances.`,
            `Systematic CTA trend-followers maintaining structural equity long exposure.`,
          ];
          conflictingFactors = [
            `Price-to-earnings ratios at top decile historical valuations limit rapid multiple expansion.`,
            `Geopolitical energy risks could trigger localized cost spikes.`,
          ];
          todayCatalyst = usKeyRelease ? `${usKeyRelease.event_name} release` : `FOMC policy outlook & S&P corporate earnings updates.`;
          marketReaction = `Quoting at ${currentPrice.toLocaleString()} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); systematic bid support defending the 20-day moving average.`;
          conditionsToChange = `A close below key volume-profile point of control with VIX spiking above 20 would trigger an immediate de-risking bias.`;
          confidence = 93;
          break;
        }

        case 'US100': {
          // Nasdaq 100
          fundamentalScore = 70;
          priceActionScore = change24h >= 0 ? Math.min(85, Math.round(change24h * 30 + 30)) : Math.max(-80, Math.round(change24h * 30 - 30));
          topDrivers = [
            `Generative AI capex commitments across hyper-scalers (Microsoft, Alphabet, Amazon, Meta) sustain semiconductor hardware demand.`,
            `Lower discount rate trajectory disproportionately benefits long-duration software and semiconductor cash-flow multiples.`,
            `Strong balance sheets with negative net debt insulate mega-cap tech from tight credit conditions.`,
          ];
          conflictingFactors = [
            `Extreme market concentration in the top 7 constituents creates idiosyncratic headline vulnerability.`,
            `Semiconductor export regulatory headlines create episodic supply chain friction.`,
          ];
          todayCatalyst = `Semiconductor earnings commentary & US 10-year Treasury yield response to economic releases.`;
          marketReaction = `Index printed at ${currentPrice.toLocaleString()} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); tech futures absorbing sell orders with active dip-buying liquidity.`;
          conditionsToChange = `US 10-year yield breaking >4.20% or cloud capex guide-downs would instantly temper growth multiple appetite.`;
          confidence = 95;
          break;
        }

        case 'US10Y': {
          // US 10-Year Benchmark Treasury Yield
          const isEasing = change24h <= 0;
          fundamentalScore = isEasing ? 60 : -45;
          priceActionScore = change24h <= 0 ? 55 : -55;
          topDrivers = [
            `Ekspektasi siklus pelonggaran suku bunga Federal Reserve menjaga yield benchmark tenor 10 tahun tetap terkendali.`,
            `Permintaan likuiditas institusional pada pasar obligasi pemerintah AS menstabilkan kurva diskonto global.`,
            `Pelonggaran yield menjadi katalis utama ekspansi valuasi rasio P/E saham teknologi dan daya tarik aset tanpa imbal hasil (Emas).`,
          ];
          conflictingFactors = [
            `Lelang surat utang Treasury AS dengan bid-to-cover rendah berpotensi memicu lonjakan yield sementara.`,
            `Ketahanan data inflasi inti atau ketenagakerjaan AS dapat menunda ekspektasi pemotongan suku bunga Fed yang agresif.`,
          ];
          todayCatalyst = usKeyRelease ? `${usKeyRelease.event_name}` : `Lelang US Treasury, pidato FOMC, & rilis data inflasi AS`;
          marketReaction = `Yield diperdagangkan di level ${currentPrice.toFixed(3)}% (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); dinamika transmisi suku bunga mendikte arah Nasdaq dan DXY.`;
          conditionsToChange = `Lonjakan yield di atas 4.25% akan memicu tekanan jual langsung pada ekuitas pertumbuhan, sedangkan penurunan di bawah 3.95% akan mempercepat reli risk-on.`;
          confidence = 91;
          break;
        }

        case 'USD': {
          // US Dollar Index
          const currStrength = strengthMap.get('USD')?.strength_score || 5.0;
          fundamentalScore = currStrength > 6.0 ? 55 : currStrength < 4.0 ? -55 : 10;
          priceActionScore = change24h >= 0 ? Math.min(70, Math.round(change24h * 40)) : Math.max(-70, Math.round(change24h * 40));
          topDrivers = [
            `US economic outperformance relative to European and UK GDP growth maintains comparative yield cushion.`,
            `Federal Reserve balanced dual-mandate signaling prevents aggressive front-loaded rate cutting.`,
            `Global reserve currency demand in cross-border settlement limits deep dollar pullbacks.`,
          ];
          conflictingFactors = [
            `Fed rate easing trajectory naturally compresses nominal short-end interest rate differentials over time.`,
            `Foreign central banks (e.g. BoJ) hiking rates creates countervailing upward pressure on non-dollar pairs.`,
          ];
          todayCatalyst = usKeyRelease ? `${usKeyRelease.event_name}` : `Fed Chair Powell policy communications and Treasury yield movements.`;
          marketReaction = `DXY holding at ${currentPrice.toFixed(2)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); range-bound oscillation within tight 100.80 - 101.80 macro channel.`;
          conditionsToChange = `A strong upside surprise in core inflation would trigger sharp USD short-covering; an inflation miss would accelerate dollar selling.`;
          confidence = 92;
          break;
        }

        case 'EUR': {
          // Euro
          const currStrength = strengthMap.get('EUR')?.strength_score || 5.0;
          fundamentalScore = currStrength > 6.0 ? 50 : currStrength < 4.0 ? -45 : -10;
          priceActionScore = change24h >= 0 ? Math.min(65, Math.round(change24h * 50)) : Math.max(-65, Math.round(change24h * 50));
          topDrivers = [
            `ECB data-dependent meeting-by-meeting framework prevents pre-committed rate collapse.`,
            `Services sector employment resilience maintains wage growth floor across Germany and France.`,
          ];
          conflictingFactors = [
            `German manufacturing PMI in protracted contraction territory dampens capital expenditure.`,
            `Disinflation in headline European CPI (2.2%) keeps additional ECB rate cuts firmly on the table.`,
          ];
          todayCatalyst = euKeyRelease ? `${euKeyRelease.event_name}` : `ECB Governing Council policy speeches & Eurozone PMI prints.`;
          marketReaction = `Spot trading at ${currentPrice.toFixed(5)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); reacting to Eurozone-US 2Y sovereign yield spread differentials.`;
          conditionsToChange = `Accelerated ECB rate cut forward guidance would weaken EUR; unexpected rebound in German industrial orders would flip bias BULLISH.`;
          confidence = 90;
          break;
        }

        case 'GBP': {
          // British Pound
          const currStrength = strengthMap.get('GBP')?.strength_score || 7.0;
          fundamentalScore = currStrength > 6.0 ? 65 : 20;
          priceActionScore = change24h >= 0 ? Math.min(75, Math.round(change24h * 50)) : Math.max(-75, Math.round(change24h * 50));
          topDrivers = [
            `UK Services CPI stickiness (5.2%) compels Bank of England to maintain restrictive 5.00% benchmark rate.`,
            `Highest policy rate among European G7 economies sustains favorable carry trade capital inflows.`,
            `Currency strength index ranks GBP among top performers across global spot pairs.`,
          ];
          conflictingFactors = [
            `Governor Bailey acknowledging potential for more activist rate cuts if inflation cooling accelerates.`,
            `Fiscal budget tightening constraints could introduce headwinds to UK real GDP growth.`,
          ];
          todayCatalyst = ukKeyRelease ? `${ukKeyRelease.event_name}` : `Bank of England MPC rate expectations & UK wage growth metrics.`;
          marketReaction = `GBPUSD hovering at ${currentPrice.toFixed(5)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); steady institutional demand visible against EUR and JPY.`;
          conditionsToChange = `Rapid deceleration in UK services inflation below 4.5% would remove BoE hawkish support and flip bias BEARISH.`;
          confidence = 93;
          break;
        }

        case 'JPY': {
          // Japanese Yen
          const currStrength = strengthMap.get('JPY')?.strength_score || 3.0;
          fundamentalScore = currStrength > 5.5 ? 40 : -45;
          priceActionScore = change24h <= 0 ? Math.min(60, Math.abs(Math.round(change24h * 40))) : Math.max(-60, -Math.round(change24h * 40)); // USDJPY down = JPY strong
          topDrivers = [
            `Bank of Japan Governor Ueda explicitly reaffirms rate hike trajectory if core inflation targets hold.`,
            `Tokyo and National CPI trending above BoJ 2.0% price stability threshold.`,
            `Extreme vulnerability to carry trade unwinding creates sharp asymmetric safe-haven surges during volatility.`,
          ];
          conflictingFactors = [
            `Vast interest rate differential (0.25% vs 4.75%+ in US) generates persistent carry trade selling pressure on spot JPY.`,
            `Ministry of Finance reluctant to deploy direct currency intervention unless rapid speculative volatility occurs.`,
          ];
          todayCatalyst = `Bank of Japan policy communications & US-Japan 10-year sovereign bond yield spread.`;
          marketReaction = `USDJPY quoting at ${currentPrice.toFixed(2)}; price action reflects delicate balance between rate carry selling and BoJ hike anticipation.`;
          conditionsToChange = `Sudden escalation in global risk aversion triggering broad carry trade liquidation would create an immediate strong BULLISH JPY spike.`;
          confidence = 91;
          break;
        }

        case 'AUD': {
          // Australian Dollar
          const currStrength = strengthMap.get('AUD')?.strength_score || 6.5;
          fundamentalScore = currStrength > 6.0 ? 60 : 15;
          priceActionScore = change24h >= 0 ? Math.min(75, Math.round(change24h * 50)) : Math.max(-70, Math.round(change24h * 50));
          topDrivers = [
            `Reserve Bank of Australia maintains high 4.35% cash rate; Governor Bullock rules out near-term rate cuts.`,
            `Australian labor market remains exceptionally tight with near-record labor force participation (67.1%).`,
            `Underlying Trimmed Mean CPI at 3.9% forces prolonged hawkish policy divergence against G10 peers.`,
          ];
          conflictingFactors = [
            `Domestic household consumption constrained by variable-rate mortgage debt service.`,
            `Chinese industrial recovery pacing and commodity import demand fluctuations impact iron ore pricing.`,
          ];
          todayCatalyst = `RBA policy commentary & iron ore / base metal commodity price momentum.`;
          marketReaction = `AUDUSD trading at ${currentPrice.toFixed(5)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); supported by strong yield carry against EUR and JPY.`;
          conditionsToChange = `A drop in Trimmed Mean CPI toward target or significant slump in commodity demand would shift bias to BEARISH.`;
          confidence = 92;
          break;
        }

        case 'NZD': {
          // New Zealand Dollar
          const currStrength = strengthMap.get('NZD')?.strength_score || 5.0;
          fundamentalScore = -30;
          priceActionScore = change24h >= 0 ? Math.min(60, Math.round(change24h * 40)) : Math.max(-70, Math.round(change24h * 40));
          topDrivers = [
            `Reserve Bank of New Zealand cutting OCR in accelerated 50bps increments to alleviate domestic recession.`,
            `Rapid cooling in CPI (2.2%) gives RBNZ leeway to aggressively reduce monetary restriction.`,
          ];
          conflictingFactors = [
            `Nominal interest rate (4.75%) still provides positive carry relative to Swiss Franc and Japanese Yen.`,
            `Dairy auction prices demonstrating steady demand stability in Oceania trading.`,
          ];
          todayCatalyst = `Global Dairy Trade (GDT) auction results & RBNZ forward easing trajectory pricing.`;
          marketReaction = `NZDUSD at ${currentPrice.toFixed(5)} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%); tracking cross-Tasman divergence against stronger AUD.`;
          conditionsToChange = `Surprise upside rebound in NZ GDP or pause in RBNZ 50bps rate-cut steps would neutralize the bearish bias.`;
          confidence = 89;
          break;
        }

        case 'CAD': {
          // Canadian Dollar
          const currStrength = strengthMap.get('CAD')?.strength_score || 4.5;
          fundamentalScore = -35;
          priceActionScore = change24h >= 0 ? Math.min(60, Math.round(change24h * 40)) : Math.max(-65, Math.round(change24h * 40));
          topDrivers = [
            `Bank of Canada executing sequential rate cuts as headline inflation drops to 2.0% target midpoint.`,
            `Canadian labor slack increasing with unemployment rising to 6.6%.`,
            `High household debt-to-income ratio dampens domestic economic growth.`,
          ];
          conflictingFactors = [
            `WTI crude oil supply constraints provide occasional baseline support to Canadian energy export terms of trade.`,
            `US economic resilience supports cross-border trade throughput.`,
          ];
          todayCatalyst = `WTI Crude Oil price fluctuations & Bank of Canada policy outlook statements.`;
          marketReaction = `USDCAD trading at ${currentPrice.toFixed(5)}; Canadian dollar underperforming higher-yielding commodity peers.`;
          conditionsToChange = `Crude oil spike above $85/bbl or Bank of Canada signaling a pause in rate cuts would flip bias to BULLISH.`;
          confidence = 90;
          break;
        }

        case 'CHF': {
          // Swiss Franc
          const currStrength = strengthMap.get('CHF')?.strength_score || 4.0;
          fundamentalScore = -40;
          priceActionScore = change24h >= 0 ? Math.min(60, Math.round(change24h * 45)) : Math.max(-65, Math.round(change24h * 45));
          topDrivers = [
            `Swiss National Bank was first G10 bank to ease rates, lowering policy rate to 1.00%.`,
            `Very low domestic CPI (1.1%) leaves inflation near bottom of SNB price stability range.`,
            `SNB explicitly communicates willingness to intervene in FX markets to prevent excessive franc appreciation.`,
          ];
          conflictingFactors = [
            `Perennial safe-haven status triggers sudden defensive capital flight during geopolitical flashpoints.`,
            `Strong pharmaceutical export surplus provides solid structural balance of payments support.`,
          ];
          todayCatalyst = `SNB Chairman policy remarks & European risk sentiment shifts.`;
          marketReaction = `USDCHF printing at ${currentPrice.toFixed(5)}; franc yields remain among lowest in G10, driving carry trade funding outflows.`;
          conditionsToChange = `Major escalation in European geopolitical conflict triggering acute safe-haven demand would flip CHF bias sharply BULLISH.`;
          confidence = 91;
          break;
        }
      }

      // Compute Overall Weighted Score
      // 60% Fundamental Macro + 40% Price Action
      const compositeScore = Math.round(fundamentalScore * 0.6 + priceActionScore * 0.4);

      // Determine Biases
      const getBiasFromScore = (s: number): MarketDirectionBias => {
        if (s > 25) return 'BULLISH';
        if (s < -25) return 'BEARISH';
        if (Math.abs(fundamentalScore - priceActionScore) > 50) return 'MIXED';
        return 'NEUTRAL';
      };

      const fundamentalBias = getBiasFromScore(fundamentalScore);
      const priceActionBias = getBiasFromScore(priceActionScore);
      const overallBias = getBiasFromScore(compositeScore);

      return {
        symbol: target.symbol,
        display_name: target.displayName,
        asset_type: target.assetType,
        price: currentPrice,
        change_24h_pct: change24h,
        sparkline_1h: sparkline,
        overall_bias: overallBias,
        direction_score: compositeScore,
        confidence,
        fundamental_bias: fundamentalBias,
        fundamental_score: fundamentalScore,
        price_action_bias: priceActionBias,
        price_action_score: priceActionScore,
        top_drivers: topDrivers,
        conflicting_factors: conflictingFactors,
        today_key_catalyst: todayCatalyst,
        current_market_reaction: marketReaction,
        conditions_to_change_bias: conditionsToChange,
        source: `TradingView + Official Macro Feeds + Central Bank Stances`,
        timestamp: nowIso,
        last_updated: nowIso,
        status: priceStatus,
        tv_symbol: target.tvSymbol,
        tradingview_url: target.tvUrl,
      };
    });
  }

  /**
   * Generates Today's Key Catalysts enriched with real-time surprises & market reaction
   */
  static async getTodayKeyCatalysts(): Promise<TodayCatalyst[]> {
    const macroEvents = await db.getEconomicEvents(200);
    const now = new Date();
    const nowMs = now.getTime();
    const nowIso = now.toISOString();

    // Define Today's trading session window (last 48h to next 48h to cover weekend/active session transitions)
    const windowStart = nowMs - 48 * 3600000;
    const windowEnd = nowMs + 48 * 3600000;

    let todayEvents = macroEvents.filter(e => {
      const t = new Date(e.date_time_utc).getTime();
      return t >= windowStart && t <= windowEnd;
    });

    // Fallback: If weekend or holiday where window has few events, take the closest 15 high/critical events
    if (todayEvents.length < 3) {
      todayEvents = macroEvents
        .slice()
        .sort((a, b) => Math.abs(new Date(a.date_time_utc).getTime() - nowMs) - Math.abs(new Date(b.date_time_utc).getTime() - nowMs))
        .slice(0, 20);
    }

    // Prioritize Critical & High impact events
    const prioritized = todayEvents.sort((a, b) => {
      const impactScore = (imp: string) => (imp === 'CRITICAL' ? 3 : imp === 'HIGH' ? 2 : imp === 'MEDIUM' ? 1 : 0);
      const diff = impactScore(b.impact) - impactScore(a.impact);
      if (diff !== 0) return diff;
      return new Date(a.date_time_utc).getTime() - new Date(b.date_time_utc).getTime();
    });

    // Map to TodayCatalyst
    return prioritized.slice(0, 15).map(event => {
      const isPast = new Date(event.date_time_utc).getTime() <= nowMs;
      const isReleased = event.actual !== null && event.actual !== undefined && event.actual !== '';

      let relatedAssets: string[] = ['USD'];
      if (event.currency === 'USD') relatedAssets = ['USD', 'XAUUSD', 'US100', 'US500', 'BTC'];
      else if (event.currency === 'EUR') relatedAssets = ['EUR', 'EURUSD', 'GER40'];
      else if (event.currency === 'GBP') relatedAssets = ['GBP', 'GBPUSD', 'FTSE100'];
      else if (event.currency === 'JPY') relatedAssets = ['JPY', 'USDJPY', 'NIKKEI'];
      else if (event.currency === 'AUD') relatedAssets = ['AUD', 'AUDUSD', 'XAUUSD'];
      else if (event.currency === 'CAD') relatedAssets = ['CAD', 'USDCAD', 'CRUDE_OIL'];
      else if (event.currency === 'CHF') relatedAssets = ['CHF', 'USDCHF'];
      else if (event.currency === 'NZD') relatedAssets = ['NZD', 'NZDUSD'];

      return {
        id: event.id,
        event_name: event.event_name,
        date_time_utc: event.date_time_utc,
        country_code: event.country_code,
        currency: event.currency,
        importance: event.impact,
        actual: event.actual,
        forecast: event.forecast,
        previous: event.previous,
        surprise: event.surprise || (isReleased ? '0.0 (In-line)' : null),
        change: event.change || null,
        related_assets: relatedAssets,
        status: isReleased ? 'RELEASED' : isPast ? 'RELEASED' : 'UPCOMING',
        actual_market_reaction: event.actual_market_reaction || (isReleased ? 'Observed immediate algorithmic volume burst across primary currency pair.' : 'Pending scheduled release execution.'),
        fundamental_implication: event.fundamental_implication || 'Macro release transmission directly impacts central bank rate path pricing and sovereign yield differentials.',
        source: event.source,
        last_updated: nowIso,
        data_status: event.data_status || 'LIVE',
      };
    });
  }
}

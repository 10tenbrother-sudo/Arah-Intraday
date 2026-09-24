/**
 * Engine Arah Market Hari Ini (Intraday Triple-Confluence Synthesis)
 * 
 * Mengintegrasikan 3 Pilar Intraday:
 * 1. FUNDAMENTAL (Katalis rilis makro, inflasi CPI, tensi bank sentral)
 * 2. INTERMARKET (US10Y yield, Spread US-DE/US-JP, DXY vs Session Open, Gold vs Real Yields)
 * 3. PRICE ACTION (Posisi harga terhadap range sesi, retest support/resisten, breakout)
 * 
 * Menghasilkan konfluensi yang fleksibel (tidak kaku):
 * - HIGH_CONVICTION (3/3 sepakat; descriptive label, not a measured edge)
 * - MODERATE (2/3 sepakat)
 * - CAUTION_TRAP (1/3 anomali / fakeout warning)
 * - NEUTRAL_CHOP (konsolidasi tanpa arah)
 */

import { db } from '../db/database.js';
import {
  ArahMarketTodayData,
  IntradayPairConfluence,
  CurrencyStrengthConfluenceItem,
  IntermarketSpreadItem,
  IndexCorrelationMetrics,
  TradingSessionName,
  MarketPrice,
  CurrencyStrength,
} from '../types.js';

export class ArahMarketEngine {
  /**
   * Menghasilkan sintesis real-time terpadu untuk segmen Arah Market Hari Ini
   */
  static async getArahMarketToday(): Promise<ArahMarketTodayData> {
    const prices = await db.getAllMarketPrices();
    const strengths = await db.getCurrencyStrength();
    const events = await db.getAllEvents(30);
    const macroCalendar = await db.getEconomicEvents(30);

    const priceMap = new Map<string, MarketPrice>();
    prices.forEach(p => {
      priceMap.set(p.symbol, p);
      // Map Forex & asset aliases agar pencarian pair tidak return 0/undefined
      if (p.symbol === 'EUR') priceMap.set('EURUSD', p);
      if (p.symbol === 'GBP') priceMap.set('GBPUSD', p);
      if (p.symbol === 'JPY') priceMap.set('USDJPY', p);
      if (p.symbol === 'AUD') priceMap.set('AUDUSD', p);
      if (p.symbol === 'CAD') priceMap.set('USDCAD', p);
      if (p.symbol === 'CHF') priceMap.set('USDCHF', p);
      if (p.symbol === 'NZD') priceMap.set('NZDUSD', p);
      if (p.symbol === 'USD') priceMap.set('DXY', p);
    });

    const strengthMap = new Map<string, CurrencyStrength>();
    strengths.forEach(s => strengthMap.set(s.currency, s));

    // 1. Tentukan Sesi Aktif Berdasarkan Jam UTC
    const now = new Date();
    const utcHour = now.getUTCHours();
    let activeSession: TradingSessionName = 'LONDON';
    let sessionStatusText = 'London session active (European FX and commodity liquidity)';

    if (utcHour >= 13 && utcHour < 16) {
      activeSession = 'OVERLAP';
      sessionStatusText = 'London - New York overlap (peak global liquidity and volatility)';
    } else if (utcHour >= 16 && utcHour < 21) {
      activeSession = 'NEW_YORK';
      sessionStatusText = 'New York session active (US data, Wall Street and bonds)';
    } else if (utcHour >= 21 || utcHour < 0) {
      activeSession = 'SYDNEY';
      sessionStatusText = 'Pacific / Sydney session (early Pacific liquidity)';
    } else if (utcHour >= 0 && utcHour < 8) {
      activeSession = 'TOKYO';
      sessionStatusText = 'Asia / Tokyo session active (BoJ, yen and regional sentiment)';
    }

    // 2. Barometer Intermarket Kunci
    const dxyPrice = priceMap.get('USD')?.price || 103.8;
    const dxyChange = priceMap.get('USD')?.change_24h_pct || 0;
    const us10yPrice = priceMap.get('US10Y')?.price || 4.25;
    const us10yChange = priceMap.get('US10Y')?.change_24h_pct || 0;
    const sp500Change = priceMap.get('US500')?.change_24h_pct || 0;
    const goldChange = priceMap.get('XAUUSD')?.change_24h_pct || 0;

    const dxyBiasVsOpen: 'ABOVE_OPEN' | 'BELOW_OPEN' | 'AT_OPEN' =
      dxyChange > 0.05 ? 'ABOVE_OPEN' : dxyChange < -0.05 ? 'BELOW_OPEN' : 'AT_OPEN';

    // Session change of the US 10Y in basis points. The feed reports a percent
    // change, so the yield moves by price * pct/100 percentage points, which is
    // price * pct basis points. Downstream spreads used to fabricate a session
    // delta; they now report this real number.
    const us10yChangeBps = Number((us10yPrice * us10yChange).toFixed(1));

    // US10Y vs Bund Jerman 10Y (Proksi Jerman ~ 2.42%)
    const bund10yEstimated = 2.42;
    const usDeSpread = Number((us10yPrice - bund10yEstimated).toFixed(2));

    // US10Y vs JGB Jepang 10Y (Proksi Jepang ~ 0.98%)
    const jgb10yEstimated = 0.98;
    const usJpSpread = Number((us10yPrice - jgb10yEstimated).toFixed(2));

    // US 10Y minus an assumed 2.25% breakeven. No TIPS or 2Y feed exists, so
    // this is a nominal-minus-assumed-breakeven proxy, not a traded real yield.
    // A curve slope is not computable from the available instruments, so none
    // is synthesised.
    const realYield10y = Number((us10yPrice - 2.25).toFixed(2));

    // Captured once so the basket average below can be compared against it.
    const usdScoreBaseline = strengthMap.get('USD')?.strength_score ?? 5.0;

    const intermarketSpreads: IntermarketSpreadItem[] = [
      {
        id: 'spread-us-de',
        name: 'Transatlantic Rate Differential',
        formulaLabel: 'US10Y - Bund 10Y',
        currentValue: usDeSpread,
        unit: '%',
        changeSessionBps: us10yChangeBps,
        trend: us10yChange > 0 ? 'WIDENING' : us10yChange < 0 ? 'NARROWING' : 'STABLE',
        targetPair: 'EURUSD',
        interpretation:
          usDeSpread > 1.7
            ? 'Spread widening in favour of the US dollar (EUR/USD gravity likely to stall or stay pressured).'
            : 'Spread narrowing (opens room for euro strength).',
      },
      {
        id: 'spread-us-jp',
        name: 'Carry Trade Yield Engine',
        formulaLabel: 'US10Y - JGB 10Y',
        currentValue: usJpSpread,
        unit: '%',
        changeSessionBps: us10yChangeBps,
        trend: us10yChange > 0 ? 'WIDENING' : us10yChange < 0 ? 'NARROWING' : 'STABLE',
        targetPair: 'USDJPY',
        interpretation:
          usJpSpread > 3.0
            ? 'US-Japan rate differential is very wide (the main fuel for USD/JPY upside and long-USD carry trades).'
            : 'Rate differential is flattening (watch for a yen reversal or carry unwinding).',
      },
      {
        id: 'spread-real-yield',
        name: 'US 10Y Real Yield (nominal less assumed breakeven)',
        formulaLabel: 'Nominal 10Y - Est. 2.25% Breakeven',
        currentValue: realYield10y,
        unit: '%',
        changeSessionBps: us10yChangeBps,
        trend: us10yChange > 0 ? 'WIDENING' : us10yChange < 0 ? 'NARROWING' : 'STABLE',
        targetPair: 'XAUUSD',
        interpretation:
          realYield10y > 1.9
            ? 'High real yields raise the opportunity cost of gold (XAU/USD prone to resistance on rallies).'
            : 'Real yields easing below 1.8% (a positive catalyst for safe-haven gold rallies).',
      },
    ];

    // Barometer Intermarket US100 vs US30 (Tech vs Cyclical Rotation)
    const us100PriceObj = priceMap.get('US100');
    const us30PriceObj = priceMap.get('US30');
    const us100Price = us100PriceObj?.price || 19950.0;
    const us100Change = us100PriceObj?.change_24h_pct || 0;
    const us30Price = us30PriceObj?.price || 42100.0;
    const us30Change = us30PriceObj?.change_24h_pct || 0;

    const ratioUs100ToUs30 = Number((us100Price / (us30Price || 1)).toFixed(4));
    let ratioTrend: 'OUTPERFORMING' | 'UNDERPERFORMING' | 'EQUAL' = 'EQUAL';
    if (us100Change > us30Change + 0.1) {
      ratioTrend = 'OUTPERFORMING';
    } else if (us30Change > us100Change + 0.1) {
      ratioTrend = 'UNDERPERFORMING';
    }

    let marketRotationRegime: 'TECH_LEADERSHIP' | 'FLIGHT_TO_VALUE' | 'BROAD_RALLY' | 'BROAD_SELLOFF' | 'BALANCED_ROTATION' = 'BALANCED_ROTATION';
    let regimeDescription = '';
    let preferredAsset: 'US100' | 'US30' | 'NEUTRAL' = 'NEUTRAL';
    let playbookReason = '';
    let yieldConditionTrigger = '';

    if (us100Change > 0.08 && us30Change < -0.05) {
      marketRotationRegime = 'TECH_LEADERSHIP';
      regimeDescription = 'Tech mega-caps and AI hyperscalers lead the equity advance. US100 outperforms US30 (Dow Jones) as discount yields stay stable.';
      preferredAsset = 'US100';
      playbookReason = 'Buying momentum is concentrated in semis and software; defensive industrials in US30 lag.';
      yieldConditionTrigger = 'US10Y stable or easing below 4.25% validates the expanding US100/US30 ratio.';
    } else if (us30Change > 0.08 && us100Change < -0.05) {
      marketRotationRegime = 'FLIGHT_TO_VALUE';
      regimeDescription = 'Defensive rotation into cyclicals and banks (US30). Technology names (US100) face valuation pressure from sticky bond yields.';
      preferredAsset = 'US30';
      playbookReason = 'Financials, energy, and traditional industrials in the Dow Jones 30 draw rotation flows out of growth stocks.';
      yieldConditionTrigger = 'A US10Y yield above 4.30% compresses the US100 P/E multiple and favours US30 value stocks.';
    } else if (us100Change > 0.1 && us30Change > 0.1) {
      marketRotationRegime = 'BROAD_RALLY';
      regimeDescription = 'A broad Wall Street rally backed by risk-on sentiment and supportive global liquidity.';
      preferredAsset = us100Change >= us30Change ? 'US100' : 'US30';
      playbookReason = 'All Wall Street indices trade higher in step with a softer US dollar.';
      yieldConditionTrigger = 'DXY trading below the session open supports buying US equity indices.';
    } else if (us100Change < -0.15 && us30Change < -0.15) {
      marketRotationRegime = 'BROAD_SELLOFF';
      regimeDescription = 'Simultaneous selling across US equity indices amid risk-off sentiment or a macro volatility spike.';
      preferredAsset = 'NEUTRAL';
      playbookReason = 'Liquidity pressure weighs on equities; prefer waiting or watch the daily support boundary.';
      yieldConditionTrigger = 'A break above US10Y resistance or a sharp DXY rally would trigger de-risking.';
    } else {
      marketRotationRegime = 'BALANCED_ROTATION';
      regimeDescription = 'US equity indices are stable, consolidating around the session open. No extreme sector rotation between growth and value yet.';
      preferredAsset = 'NEUTRAL';
      playbookReason = 'Intraday balance between technology and cyclicals; wait for a catalyst from US data in the New York session.';
      yieldConditionTrigger = 'A flat US10Y keeps index moves within a consolidation range.';
    }

    const indexCorrelation: IndexCorrelationMetrics = {
      us100Price,
      us100Change,
      us30Price,
      us30Change,
      ratioUs100ToUs30,
      ratioTrend,
      marketRotationRegime,
      regimeDescription,
      tacticalPlaybook: {
        preferredAsset,
        reason: playbookReason,
        yieldConditionTrigger,
      },
    };

    // 3. Klasifikasi Rezim Pasar Global
    let regimeTitle = 'BALANCED ROTATIONAL REGIME';
    let regimeBadgeColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';
    let riskScore = 15;
    let summaryNarrative =
      'Intraday capital flows rotate evenly across asset classes. No dominant panic or excess euphoria ahead of the next session\'s key data.';

    if (us10yChange > 0.4 && dxyChange > 0.2) {
      regimeTitle = 'HAWKISH YIELD PRESSURE';
      regimeBadgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
      riskScore = -45;
      summaryNarrative =
        'Rising US Treasury yields and a DXY above the session open dominate market direction. Non-USD pairs and low-yielding assets stay pressured.';
    } else if (sp500Change > 0.4 && dxyChange < -0.15) {
      regimeTitle = 'RISK-ON EXPANSION';
      regimeBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      riskScore = +65;
      summaryNarrative =
        'High risk appetite. The dollar weakens as global capital flows into equities and commodity currencies (AUD, CAD, NZD).';
    } else if (sp500Change < -0.5 && goldChange > 0.3) {
      regimeTitle = 'GLOBAL FLIGHT TO SAFETY';
      regimeBadgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
      riskScore = -75;
      summaryNarrative =
        'Geopolitical worries or a macro slowdown drive equity selling and a hunt for safe havens (gold and the Swiss franc).';
    } else if (dxyChange < -0.3 && us10yChange < -0.5) {
      regimeTitle = 'DOVISH LIQUIDITY EASING';
      regimeBadgeColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
      riskScore = +35;
      summaryNarrative =
        'A sharp fall in US Treasury yields and the dollar releases global liquidity pressure, sparking a rebound in gold and the majors.';
    }

    // Ambil berita terbaru yang berdampak
    const topCatalyst = events.find(e => e.impact_level === 'CRITICAL' || e.impact_level === 'HIGH');

    // 4. Deteksi Peringatan Anomali / Divergensi
    const anomalyAlerts: ArahMarketTodayData['anomalyAlerts'] = [];

    // Deteksi Anomali 1: Emas vs DXY
    if (dxyChange < -0.15 && goldChange < -0.1) {
      anomalyAlerts.push({
        id: 'anomaly-gold-dxy',
        severity: 'WARNING',
        title: 'XAU/USD anomaly: gold fails to rise as the dollar softens',
        description:
          'DXY softened intraday, yet XAU/USD could not capitalise and instead consolidated or fell. That signals internal selling pressure or still-sticky real yields.',
        affectedPairs: ['XAUUSD', 'EURUSD'],
        actionAdvice: 'Watch for a bull trap in gold. Do not rush to buy before price clears the session\'s key resistance.',
      });
    } else if (dxyChange > 0.2 && goldChange > 0.3) {
      anomalyAlerts.push({
        id: 'anomaly-gold-safe-haven',
        severity: 'WARNING',
        title: 'Safe-haven divergence: gold rallies alongside a firmer dollar',
        description:
          'XAU/USD strengthens together with the US dollar. That is the classic signature of a geopolitical risk spike or global liquidity panic, where investors aggressively buy protection.',
        affectedPairs: ['XAUUSD', 'US500'],
        actionAdvice: 'Prioritise risk management; the gold rally is driven by external fear, not plain FX transmission.',
      });
    }

    // Deteksi Anomali 2: USD/JPY vs Spread Imbal Hasil
    if (usJpSpread > 3.2 && (priceMap.get('JPY')?.change_24h_pct || 0) < -0.3) {
      anomalyAlerts.push({
        id: 'anomaly-usdjpy-intervention',
        severity: 'WARNING',
        title: 'USD/JPY Overextended vs Spread (Zona Sensitif Intervensi)',
        description:
          'Even though the yield spread supports upside, the current price sits in the area where Japan\'s Ministry of Finance (MoF/BoJ) has intervened verbally.',
        affectedPairs: ['USDJPY'],
        actionAdvice: 'Limit long exposure; keep a tight stop loss given the risk of a sudden intervention swing.',
      });
    }

    // Deteksi Anomali 3: US100 (Nasdaq) vs Yields Obligasi AS
    const us100Chg = priceMap.get('US100')?.change_24h_pct || 0;
    if (us10yChange > 0.4 && us100Chg > 0.4) {
      anomalyAlerts.push({
        id: 'anomaly-tech-yield-divergence',
        severity: 'WARNING',
        title: 'Divergensi Valuasi: Nasdaq Reli Melawan Lonjakan Yields',
        description:
          'Technology indices are up sharply even as US10Y yields jump. A yield spike normally compresses P/E multiples.',
        affectedPairs: ['US100', 'US500'],
        actionAdvice: 'Watch for a sudden reversal when the Wall Street cash session opens fully.',
      });
    }

    // Jika tidak ada anomali negatif, beri konfirmasi positif
    if (anomalyAlerts.length === 0) {
      anomalyAlerts.push({
        id: 'confluence-alignment-ok',
        severity: 'OPPORTUNITY',
        title: 'Intermarket Transmission In Step',
        description:
          'The transmission between the dollar, US Treasury yields, the majors, and equity indices is currently in step, with no structural anomaly.',
        affectedPairs: ['EURUSD', 'USDJPY', 'XAUUSD', 'US100', 'US30'],
        actionAdvice: 'Focus on trend-following in the direction of the current session open.',
      });
    }

    // 5. Matriks Pasangan Intraday (Triple-Confluence Synthesis)
    const targetPairs = [
      { pair: 'XAUUSD', name: 'Gold / US Dollar', tv: 'OANDA:XAUUSD' },
      { pair: 'EURUSD', name: 'Euro / US Dollar', tv: 'FX:EURUSD' },
      { pair: 'GBPUSD', name: 'British Pound / USD', tv: 'FX:GBPUSD' },
      { pair: 'USDJPY', name: 'US Dollar / Japanese Yen', tv: 'FX:USDJPY' },
      { pair: 'US100', name: 'Nasdaq 100 Index', tv: 'OANDA:NAS100USD' },
      { pair: 'US30', name: 'Dow Jones 30 Index', tv: 'OANDA:US30USD' },
      { pair: 'US500', name: 'S&P 500 CFD Index', tv: 'OANDA:SPX500USD' },
      { pair: 'AUDUSD', name: 'Australian Dollar / USD', tv: 'FX:AUDUSD' },
      { pair: 'USDCAD', name: 'US Dollar / Canadian Dollar', tv: 'FX:USDCAD' },
      { pair: 'BTC', name: 'Bitcoin / US Dollar', tv: 'BITSTAMP:BTCUSD' },
    ];

    // The strength feed is a 1-10 scale that tends to sit high, so an absolute
    // cut such as "> 5.2" never fires and pins a bias permanently. Gold's
    // fundamental read compares the dollar against the basket instead.
    const csScores = strengths.map(s => s.strength_score);
    const csAverage = csScores.length
      ? Number((csScores.reduce((a, b) => a + b, 0) / csScores.length).toFixed(2))
      : 5.0;
    const usdVsBasket = Number((usdScoreBaseline - csAverage).toFixed(2));

    const pairs: IntradayPairConfluence[] = targetPairs.map(tp => {
      const pObj = priceMap.get(tp.pair);
      const curPrice = pObj?.price || 0;
      const chg = pObj?.change_24h_pct || 0;
      const usdScore = usdScoreBaseline;

      // Cek apakah aset merupakan pasangan mata uang (Forex Pair)
      const isForexPair = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'].includes(tp.pair);
      let currencyStrengthConfluence: CurrencyStrengthConfluenceItem | undefined = undefined;

      if (isForexPair) {
        const base = tp.pair.slice(0, 3);
        const quote = tp.pair.slice(3, 6);
        const baseObj = strengthMap.get(base);
        const quoteObj = strengthMap.get(quote);
        const bScore = baseObj?.strength_score ?? 5.0;
        const bRank = baseObj?.rank ?? 4;
        const qScore = quoteObj?.strength_score ?? 5.0;
        const qRank = quoteObj?.rank ?? 4;
        const netDiff = Number((bScore - qScore).toFixed(2));

        let csBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (netDiff >= 0.4) csBias = 'BULLISH';
        else if (netDiff <= -0.4) csBias = 'BEARISH';

        const advLeader = netDiff >= 0 ? base : quote;
        const advTrailer = netDiff >= 0 ? quote : base;
        const advScoreL = netDiff >= 0 ? bScore : qScore;
        const advRankL = netDiff >= 0 ? bRank : qRank;
        const advScoreT = netDiff >= 0 ? qScore : bScore;
        const advRankT = netDiff >= 0 ? qRank : bRank;

        const diffAbs = Math.abs(netDiff);
        const advantageLabel = diffAbs >= 0.3
          ? `${advLeader} (#${advRankL}, ${advScoreL.toFixed(1)}) leads ${advTrailer} (#${advRankT}, ${advScoreT.toFixed(1)}) by +${diffAbs.toFixed(1)}`
          : `${base} (#${bRank}, ${bScore.toFixed(1)}) vs ${quote} (#${qRank}, ${qScore.toFixed(1)}) relatively balanced`;

        const summary = csBias === 'BULLISH'
          ? `Capital flow strongly favors ${base} over ${quote} (Net CS: +${netDiff.toFixed(1)}). Supports bullish setups.`
          : csBias === 'BEARISH'
          ? `Quote currency (${quote}) dominates over ${base} (Net CS: ${netDiff.toFixed(1)}). Supports bearish setups.`
          : `Relative currency strength between ${base} and ${quote} is balanced.`;

        // Evaluasi alignment terhadap Price Action (chg)
        const isPaBullish = chg > 0.05;
        const isPaBearish = chg < -0.05;
        let alignment: 'CONFIRMED' | 'DIVERGENCE' | 'NEUTRAL' = 'NEUTRAL';

        if ((csBias === 'BULLISH' && isPaBullish) || (csBias === 'BEARISH' && isPaBearish)) {
          alignment = 'CONFIRMED';
        } else if ((csBias === 'BULLISH' && isPaBearish && diffAbs >= 0.8) || (csBias === 'BEARISH' && isPaBullish && diffAbs >= 0.8)) {
          alignment = 'DIVERGENCE';
        }

        currencyStrengthConfluence = {
          isForex: true,
          baseCurrency: base,
          baseScore: bScore,
          baseRank: bRank,
          quoteCurrency: quote,
          quoteScore: qScore,
          quoteRank: qRank,
          netDifferential: netDiff,
          bias: csBias,
          alignment,
          advantageLabel,
          summary,
        };
      }

      // Hitung 3 Pilar per Pair
      let fundBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let fundDriver = 'US economic data guides Fed rate expectations';
      let fundScore = 0;

      let interBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let interSymptom = 'DXY trades moderately around the session open';
      let interScore = 0;

      let paBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let paStructure: 'SESSION_BREAKOUT' | 'RETEST_SUPPORT' | 'RETEST_RESISTANCE' | 'CHOP_RANGE' = 'CHOP_RANGE';
      let actionableZone = 'Watch the session support/resistance boundary';
      let paScore = 0;

      let recommendedAction: 'LOOK_FOR_BUY' | 'LOOK_FOR_SELL' | 'WAIT_ON_SUPPORT' | 'CAUTION_NO_TRADE' = 'WAIT_ON_SUPPORT';
      let invalidation = 'An H1 close outside the reference level';

      if (tp.pair === 'XAUUSD') {
        fundBias = usdVsBasket > 1.0 ? 'BEARISH' : usdVsBasket < -1.0 ? 'BULLISH' : 'NEUTRAL';
        fundDriver = 'Fed policy rate expectations and geopolitical hedging premium, read from the dollar versus the currency basket';
        fundScore = fundBias === 'BULLISH' ? 45 : fundBias === 'BEARISH' ? -40 : 0;

        interBias = realYield10y > 1.9 ? 'BEARISH' : realYield10y < 1.8 ? 'BULLISH' : (dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH');
        interSymptom = realYield10y > 1.9 ? `High 10Y real yield (${realYield10y}%) adds weight on gold` : `Easing real yield (${realYield10y}%) opens a safe-haven bid`;
        interScore = interBias === 'BULLISH' ? 40 : -40;

        paBias = chg > 0.2 ? 'BULLISH' : chg < -0.2 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.3 ? 'SESSION_BREAKOUT' : chg < -0.3 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = chg > 0 ? 'Pullback to the nearest session demand' : 'Test of the lower session support area';
        paScore = chg > 0.2 ? 35 : chg < -0.2 ? -35 : 0;

        if (fundBias === 'BULLISH' && interBias === 'BULLISH') {
          recommendedAction = 'LOOK_FOR_BUY';
          invalidation = 'If DXY breaks strongly above the session high';
        } else if (fundBias === 'BEARISH' && interBias === 'BEARISH') {
          recommendedAction = 'LOOK_FOR_SELL';
          invalidation = 'If US10Y yields drop below intraday support';
        } else {
          recommendedAction = 'WAIT_ON_SUPPORT';
          invalidation = 'Awaiting session breakout confirmation';
        }
      } else if (tp.pair === 'EURUSD') {
        const eurScore = strengthMap.get('EUR')?.strength_score || 5.0;
        fundBias = eurScore > usdScore + 0.1 ? 'BULLISH' : eurScore < usdScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'ECB versus Fed monetary policy outlook divergence';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -45 : 0;

        interBias = dxyBiasVsOpen === 'ABOVE_OPEN' ? 'BEARISH' : 'BULLISH';
        interSymptom = `US-DE spread at ${usDeSpread}% ${usDeSpread > 1.7 ? 'supports dollar dominance' : 'is supportive for the euro'}`;
        interScore = interBias === 'BULLISH' ? 40 : -50;

        paBias = chg > 0.1 ? 'BULLISH' : chg < -0.1 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg < -0.2 ? 'SESSION_BREAKOUT' : chg > 0.2 ? 'SESSION_BREAKOUT' : 'CHOP_RANGE';
        actionableZone = chg < 0 ? 'Sell on a rally into nearby resistance' : 'Buy the dip at session support';
        paScore = chg > 0.1 ? 30 : chg < -0.1 ? -35 : 0;

        recommendedAction = interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'LOOK_FOR_BUY';
        invalidation = 'Opposing DXY breakout through the session open';
      } else if (tp.pair === 'GBPUSD') {
        const gbpScore = strengthMap.get('GBP')?.strength_score || 5.0;
        fundBias = gbpScore > usdScore + 0.1 ? 'BULLISH' : gbpScore < usdScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Bank of England (BoE) versus Fed rate path and sticky UK services inflation';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -40 : 0;

        interBias = dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `Inverse correlation with DXY (${dxyBiasVsOpen === 'BELOW_OPEN' ? 'a softer DXY supports Cable' : 'a firmer DXY weighs on Cable'})`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = chg > 0.15 ? 'BULLISH' : chg < -0.15 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.25 ? 'SESSION_BREAKOUT' : chg < -0.25 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = chg > 0 ? 'London session demand zone' : 'Supply zone at the upper Asia-London session boundary';
        paScore = chg > 0.15 ? 30 : chg < -0.15 ? -30 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Rejection at the GBPUSD daily pivot';
      } else if (tp.pair === 'USDJPY') {
        const jpyScore = strengthMap.get('JPY')?.strength_score || 5.0;
        fundBias = usdScore >= jpyScore ? 'BULLISH' : 'BEARISH';
        fundDriver = 'Extreme rate gap between the Fed (~5%) and the Bank of Japan\'s low rate (~0.25%)';
        fundScore = fundBias === 'BULLISH' ? 55 : -40;

        // USDJPY berkorelasi POSITIF dengan DXY dan US-JP Yield Spread
        interBias = usJpSpread > 3.0 && dxyBiasVsOpen !== 'BELOW_OPEN' ? 'BULLISH' : (dxyBiasVsOpen === 'BELOW_OPEN' ? 'BEARISH' : 'NEUTRAL');
        interSymptom = `US-Japan yield spread (${usJpSpread}%) and a ${dxyBiasVsOpen === 'ABOVE_OPEN' ? 'firmer' : 'softer'} DXY drive the carry incentive`;
        interScore = interBias === 'BULLISH' ? 50 : -40;

        paBias = chg > 0.1 ? 'BULLISH' : chg < -0.1 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : chg < -0.2 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = 'Watch the price reaction near the round-number psychological level';
        paScore = chg > 0 ? 35 : -30;

        recommendedAction = interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : 'WAIT_ON_SUPPORT';
        invalidation = 'Signals of verbal intervention by MoF/BoJ officials or a sharp DXY reversal';
      } else if (tp.pair === 'US100') {
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;
        fundBias = us10yChange > 0.25 ? 'BEARISH' : us10yChange < -0.2 ? 'BULLISH' : (isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL');
        fundDriver = 'Sensitivity of tech and AI valuations to the US 10-year Treasury discount yield';
        fundScore = fundBias === 'BULLISH' ? 45 : fundBias === 'BEARISH' ? -45 : 0;

        interBias = realYield10y > 1.95 ? 'BEARISH' : realYield10y < 1.85 ? 'BULLISH' : (dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH');
        interSymptom = `10Y real yield at ${realYield10y}% ${realYield10y > 1.95 ? 'compresses technology P/E multiples' : 'is supportive for growth-stock valuations'}`;
        interScore = interBias === 'BULLISH' ? 40 : -40;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.3 ? 'SESSION_BREAKOUT' : chg < -0.3 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = isUp ? 'Breakout demand area at the New York session open' : 'Key intraday Nasdaq support';
        paScore = isUp ? 35 : isDown ? -35 : 0;

        if (fundBias === 'BULLISH' && interBias === 'BULLISH') {
          recommendedAction = 'LOOK_FOR_BUY';
          invalidation = 'If US10Y yields spike above session resistance';
        } else if (fundBias === 'BEARISH' && interBias === 'BEARISH') {
          recommendedAction = 'LOOK_FOR_SELL';
          invalidation = 'If DXY drops below the session open';
        } else {
          recommendedAction = 'WAIT_ON_SUPPORT';
          invalidation = 'Wait for the macro data release or the Wall Street session open';
        }
      } else if (tp.pair === 'US30') {
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;
        // No 2Y or curve instrument is available, so Dow fundamentals cannot be
        // read from a yield curve here. A broadly strong dollar pressures the
        // multinational earnings of the index, which is a distinct input from
        // both the spread pillar below and price action.
        fundBias = dxyBiasVsOpen === 'ABOVE_OPEN' ? 'BEARISH' : dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'NEUTRAL';
        fundDriver = 'Industrial activity health, bank earnings, and Dow 30 multinational earnings against the dollar backdrop';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -40 : 15;

        interBias = usDeSpread > 1.7 ? 'BEARISH' : 'BULLISH';
        interSymptom = `US-DE spread at ${usDeSpread}% guides rate expectations for the Dow financial sector`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : chg < -0.2 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = 'Dow 30 round-number psychological area and the London-NY session boundary';
        paScore = isUp ? 30 : isDown ? -30 : 0;

        recommendedAction = isUp && interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : isDown && interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Firm rejection at the daily support/resistance level';
      } else if (tp.pair === 'US500') {
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;
        fundBias = us10yChange > 0.35 ? 'BEARISH' : (isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL');
        fundDriver = 'Aggregate earnings barometer of 500 US companies and macro monetary liquidity expectations';
        fundScore = isUp ? 40 : isDown ? -40 : 0;

        interBias = dxyBiasVsOpen === 'BELOW_OPEN' && us10yChange <= 0.2 ? 'BULLISH' : (dxyBiasVsOpen === 'ABOVE_OPEN' && us10yChange > 0.2 ? 'BEARISH' : 'NEUTRAL');
        interSymptom = `DXY ${dxyBiasVsOpen === 'BELOW_OPEN' ? 'softer, supporting equities' : 'firmer, weighing on multinational earnings'} and 10Y yield at ${us10yPrice}%`;
        interScore = interBias === 'BULLISH' ? 35 : interBias === 'BEARISH' ? -35 : 0;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.25 ? 'SESSION_BREAKOUT' : chg < -0.25 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = isUp ? 'Wall Street open demand zone' : 'S&P 500 support retest';
        paScore = isUp ? 30 : isDown ? -30 : 0;
 
        recommendedAction = isUp && interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : isDown && interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Sharp reversal breaking through daily session support';
      } else if (tp.pair === 'AUDUSD') {
        const audScore = strengthMap.get('AUD')?.strength_score || 5.0;
        fundBias = audScore > usdScore + 0.1 ? 'BULLISH' : audScore < usdScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'RBA versus Fed rate divergence and Australia\'s export commodity demand outlook';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -40 : 0;

        // AUDUSD berbanding terbalik dengan DXY dan searah dengan sentimen komoditas/risk-on
        interBias = dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `Inverse correlation with DXY and transmission of commodity risk-on/risk-off sentiment`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = chg > 0.15 ? 'BULLISH' : chg < -0.15 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : chg < -0.2 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = 'Upper/lower boundary of the Asia-Pacific session range';
        paScore = chg > 0.15 ? 30 : chg < -0.15 ? -30 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'False breakout at the London session open level';
      } else if (tp.pair === 'USDCAD') {
        // PERHATIAN: USD adalah Base Currency, CAD adalah Quote Currency!
        const cadScore = strengthMap.get('CAD')?.strength_score || 5.0;
        fundBias = usdScore > cadScore + 0.1 ? 'BULLISH' : usdScore < cadScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Bank of Canada (BoC) versus Fed rate divergence and Canada\'s energy sector transmission';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -40 : 0;

        // USDCAD berkorelasi SEARAH/POSITIF dengan DXY! (Dolar naik -> USDCAD naik)
        interBias = dxyBiasVsOpen === 'ABOVE_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `Direct correlation with DXY (USD base) and petro-currency CAD transmission`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = chg > 0.1 ? 'BULLISH' : chg < -0.1 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : chg < -0.2 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = 'Reaction zone around joint US-Canada macro releases (New York session)';
        paScore = chg > 0.1 ? 30 : chg < -0.1 ? -30 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'A sharp crude oil spike that suddenly strengthens the Canadian dollar';
      } else if (tp.pair === 'BTC') {
        const isUp = chg > 0.5;
        const isDown = chg < -0.5;
        fundBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Global monetary liquidity (M2), institutional spot ETF flows, and crypto risk appetite';
        fundScore = isUp ? 45 : isDown ? -45 : 0;

        // BTC berkorelasi TERBALIK dengan DXY & Real Yields, searah dengan saham teknologi US100
        interBias = dxyBiasVsOpen === 'BELOW_OPEN' && realYield10y < 1.9 ? 'BULLISH' : (dxyBiasVsOpen === 'ABOVE_OPEN' ? 'BEARISH' : 'NEUTRAL');
        interSymptom = `High-beta liquidity asset (inverse to DXY, aligned with US100 sentiment)`;
        interScore = interBias === 'BULLISH' ? 40 : interBias === 'BEARISH' ? -40 : 0;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 1.0 ? 'SESSION_BREAKOUT' : chg < -1.0 ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = 'Round-number psychological levels in thousands of dollars and derivatives leverage liquidity';
        paScore = isUp ? 35 : isDown ? -35 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Break of Bitcoin\'s daily liquidity support level';
      } else {
        // Fallback generik
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;

        fundBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Global liquidity sentiment and the daily risk appetite';
        fundScore = isUp ? 30 : isDown ? -30 : 0;

        interBias = dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `DXY is ${dxyBiasVsOpen === 'ABOVE_OPEN' ? 'above' : 'below'} the session open`;
        interScore = interBias === 'BULLISH' ? 25 : -25;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = isUp ? 'SESSION_BREAKOUT' : isDown ? 'RETEST_RESISTANCE' : 'CHOP_RANGE';
        actionableZone = isUp ? 'Pullback demand area' : 'Retracement supply area';
        paScore = isUp ? 25 : isDown ? -25 : 0;

        recommendedAction = isUp && interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : isDown && interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Price reversal through the session open level';
      }

      // Hitung Confluence Status & Conviction Score.
      // For Forex pairs: Currency Strength Direction (csBias) is a distinct primary confluence pillar alongside Intermarket (interBias) and Price Action (paBias).
      // For Non-Forex pairs: Fundamental (fundBias), Intermarket (interBias), and Price Action (paBias) form the 3 pillars.
      const csBias = currencyStrengthConfluence?.bias;
      const effectiveBiases = isForexPair && csBias
        ? [csBias, interBias, paBias]
        : [fundBias, interBias, paBias];

      const bullishCount = effectiveBiases.filter(b => b === 'BULLISH').length;
      const bearishCount = effectiveBiases.filter(b => b === 'BEARISH').length;

      let directionalBias: IntradayPairConfluence['directionalBias'] = 'NEUTRAL';
      let confluenceStatus: IntradayPairConfluence['confluenceStatus'] = 'NEUTRAL_CHOP';
      let convictionScore = 50;

      const hasCsDivergence = currencyStrengthConfluence?.alignment === 'DIVERGENCE';

      // 2 or more confirmations rule:
      // - 3/3 Aligned -> STRONG_BULLISH / STRONG_BEARISH, HIGH_CONVICTION, LOOK_FOR_BUY / LOOK_FOR_SELL
      // - 2/3 Aligned -> BULLISH / BEARISH, MODERATE, LOOK_FOR_BUY / LOOK_FOR_SELL
      // - Divergence / Contradiction -> CAUTION_TRAP, CAUTION_NO_TRADE
      // - < 2 Aligned -> NEUTRAL_CHOP, WAIT_ON_SUPPORT
      if (hasCsDivergence || (paBias !== 'NEUTRAL' && (effectiveBiases[0] !== 'NEUTRAL' && effectiveBiases[0] !== paBias && interBias !== paBias))) {
        // Price action conflicts with Currency Strength or Macro/Intermarket
        directionalBias = paBias === 'BULLISH' ? 'BULLISH' : 'BEARISH';
        confluenceStatus = 'CAUTION_TRAP';
        convictionScore = 40;
        recommendedAction = 'CAUTION_NO_TRADE';
      } else if (bullishCount === 3) {
        directionalBias = 'STRONG_BULLISH';
        confluenceStatus = 'HIGH_CONVICTION';
        convictionScore = 92;
        recommendedAction = 'LOOK_FOR_BUY';
      } else if (bearishCount === 3) {
        directionalBias = 'STRONG_BEARISH';
        confluenceStatus = 'HIGH_CONVICTION';
        convictionScore = 92;
        recommendedAction = 'LOOK_FOR_SELL';
      } else if (bullishCount === 2) {
        directionalBias = 'BULLISH';
        confluenceStatus = 'MODERATE';
        convictionScore = 75;
        recommendedAction = 'LOOK_FOR_BUY';
      } else if (bearishCount === 2) {
        directionalBias = 'BEARISH';
        confluenceStatus = 'MODERATE';
        convictionScore = 75;
        recommendedAction = 'LOOK_FOR_SELL';
      } else {
        directionalBias = 'NEUTRAL';
        confluenceStatus = 'NEUTRAL_CHOP';
        convictionScore = 50;
        recommendedAction = 'WAIT_ON_SUPPORT';
      }

      const csWarning = hasCsDivergence
        ? `CS divergence alert: price action is not backed by the currency strength spread (${currencyStrengthConfluence?.advantageLabel}). Possible fakeout.`
        : undefined;

      // Descriptive-not-predictive disclosure, surfaced in the UI so a neat 3/3
      // alignment is not read as a validated signal.
      const alignmentNote = confluenceStatus === 'HIGH_CONVICTION'
        ? '3/3 alignment. This describes how neatly the pillars agree right now, not a measured edge: backtested over 2026-07..09 the 3/3 bucket hit 45% at +24h versus 51.7% for simply staying long. Treat it as context, not a trigger.'
        : undefined;

      return {
        pair: tp.pair,
        displayName: tp.name,
        currentPrice: curPrice,
        change24hPct: chg,
        directionalBias,
        confluenceStatus,
        convictionScore,
        currencyStrength: currencyStrengthConfluence,
        fundamental: {
          bias: fundBias,
          keyDriver: fundDriver,
          score: fundScore,
        },
        intermarket: {
          bias: interBias,
          primarySymptom: interSymptom,
          score: interScore,
        },
        priceAction: {
          bias: paBias,
          structure: paStructure,
          actionableZone,
          score: paScore,
        },
        intradayPlan: {
          recommendedAction,
          invalidationTrigger: invalidation,
          warningNote: csWarning || (confluenceStatus === 'CAUTION_TRAP' ? 'Watch for a liquidity trap; the price move is not backed by macro or intermarket pillars.' : alignmentNote),
        },
        tvSymbol: tp.tv,
      };
    });

    return {
      activeSession,
      sessionStatusText,
      globalRegime: {
        title: regimeTitle,
        badgeColor: regimeBadgeColor,
        riskScore,
        dxyBiasVsOpen,
        summaryNarrative,
        topCatalystHeadline: topCatalyst?.title,
      },
      intermarketSpreads,
      indexCorrelation,
      anomalyAlerts,
      pairs,
      generatedAt: now.toISOString(),
    };
  }
}

/**
 * Engine Arah Market Hari Ini (Intraday Triple-Confluence Synthesis)
 * 
 * Mengintegrasikan 3 Pilar Intraday:
 * 1. FUNDAMENTAL (Katalis rilis makro, inflasi CPI, tensi bank sentral)
 * 2. INTERMARKET (Yields US02Y, US10Y, Spread US-DE/US-JP, DXY vs Session Open, Gold vs Real Yields)
 * 3. PRICE ACTION (Posisi harga terhadap range sesi, retest support/resisten, breakout)
 * 
 * Menghasilkan konfluensi yang fleksibel (tidak kaku):
 * - HIGH_CONVICTION (3/3 sepakat)
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
  public static getArahMarketToday(): ArahMarketTodayData {
    const prices = db.getAllMarketPrices();
    const strengths = db.getCurrencyStrength();
    const events = db.getAllEvents(30);
    const macroCalendar = db.getEconomicEvents(30);

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
    let sessionStatusText = 'Sesi London Aktif (Likuiditas Valuta Eropa & Komoditas)';

    if (utcHour >= 13 && utcHour < 16) {
      activeSession = 'OVERLAP';
      sessionStatusText = 'London - New York Overlap (Puncak Likuiditas & Volatilitas Global)';
    } else if (utcHour >= 16 && utcHour < 21) {
      activeSession = 'NEW_YORK';
      sessionStatusText = 'Sesi New York Aktif (Fokus Data AS, Wall Street & Obligasi)';
    } else if (utcHour >= 21 || utcHour < 0) {
      activeSession = 'SYDNEY';
      sessionStatusText = 'Sesi Pasifik / Sydney (Likuiditas Awal Pasifik)';
    } else if (utcHour >= 0 && utcHour < 8) {
      activeSession = 'TOKYO';
      sessionStatusText = 'Sesi Asia / Tokyo Aktif (Fokus BoJ, Yen & Sentimen Regional)';
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

    // Estimasi Yield Spreads & Differential
    // US10Y - US02Y (Curve Slope: US02Y proksi bergerak sensitif terhadap ekspektasi The Fed)
    const usCurveSlope = Number((0.14 - (dxyChange * 0.30)).toFixed(2));
    const us02yEstimated = Number((us10yPrice - usCurveSlope).toFixed(2));
    const us10yMinusUs02y = usCurveSlope;

    // US10Y vs Bund Jerman 10Y (Proksi Jerman ~ 2.45%)
    const bund10yEstimated = 2.42;
    const usDeSpread = Number((us10yPrice - bund10yEstimated).toFixed(2));

    // US10Y vs JGB Jepang 10Y (Proksi Jepang ~ 0.95%)
    const jgb10yEstimated = 0.98;
    const usJpSpread = Number((us10yPrice - jgb10yEstimated).toFixed(2));

    // US 10Y Real Yields (Nominal 10Y - Breakeven 2.25%)
    const realYield10y = Number((us10yPrice - 2.25).toFixed(2));

    const intermarketSpreads: IntermarketSpreadItem[] = [
      {
        id: 'spread-us10y-us02y',
        name: 'US Yield Curve Slope',
        formulaLabel: 'US10Y - US02Y',
        currentValue: us10yMinusUs02y,
        unit: '%',
        changeSessionBps: dxyChange > 0 ? +3.2 : -2.5,
        trend: dxyChange > 0 ? 'WIDENING' : 'NARROWING',
        targetPair: 'US500',
        interpretation:
          us10yMinusUs02y > 0
            ? 'Kurva yield normal (disinflasi bertahap, sentimen pasar saham relatif stabil).'
            : 'Kurva flat/inversi (tekanan pengetatan likuiditas The Fed jangka pendek masih aktif).',
      },
      {
        id: 'spread-us-de',
        name: 'Transatlantic Rate Differential',
        formulaLabel: 'US10Y - Bund 10Y',
        currentValue: usDeSpread,
        unit: '%',
        changeSessionBps: us10yChange > 0 ? +4.5 : -3.0,
        trend: us10yChange > 0 ? 'WIDENING' : 'NARROWING',
        targetPair: 'EURUSD',
        interpretation:
          usDeSpread > 1.7
            ? 'Spread melebar untuk keunggulan US Dollar (Gravitasi EUR/USD cenderung tertahan/tertekan).'
            : 'Spread menyempit (membuka ruang penguatan bagi mata uang Euro).',
      },
      {
        id: 'spread-us-jp',
        name: 'Carry Trade Yield Engine',
        formulaLabel: 'US10Y - JGB 10Y',
        currentValue: usJpSpread,
        unit: '%',
        changeSessionBps: us10yChange > 0 ? +5.1 : -4.2,
        trend: us10yChange > 0 ? 'WIDENING' : 'NARROWING',
        targetPair: 'USDJPY',
        interpretation:
          usJpSpread > 3.0
            ? 'Selisih suku bunga AS-Jepang sangat lebar (Bahan bakar utama kenaikan USD/JPY / Carry Trade long USD).'
            : 'Selisih bunga melandai (waspada pembalikan penguatan Yen / aksi unwinding).',
      },
      {
        id: 'spread-real-yield',
        name: 'US 10Y Real Yield (TIPS)',
        formulaLabel: 'Nominal 10Y - Inflation Exp',
        currentValue: realYield10y,
        unit: '%',
        changeSessionBps: us10yChange > 0 ? +2.8 : -1.9,
        trend: us10yChange > 0 ? 'WIDENING' : 'NARROWING',
        targetPair: 'XAUUSD',
        interpretation:
          realYield10y > 1.9
            ? 'Real yield tinggi menaikkan opportunity cost emas (XAU/USD rentan menghadapi resistensi saat reli).'
            : 'Real yield melandai di bawah 1.8% (Katalis positif bagi reli safe-haven Emas).',
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
      regimeDescription = 'Mega-cap teknologi & AI hyperscalers memimpin penguatan pasar saham. US100 mengungguli US30 (Dow Jones) seiring kestabilan yield diskonto obligasi.';
      preferredAsset = 'US100';
      playbookReason = 'Momentum beli terkonsentrasi di sektor semikonduktor & software; defensif industrials di US30 tertinggal.';
      yieldConditionTrigger = 'US10Y stabil atau melandai di bawah 4.25% memvalidasi ekspansi rasio US100/US30.';
    } else if (us30Change > 0.08 && us100Change < -0.05) {
      marketRotationRegime = 'FLIGHT_TO_VALUE';
      regimeDescription = 'Rotasi defensif ke saham siklikal dan perbankan (US30). Saham teknologi (US100) menghadapi tekanan valuasi akibat imbal hasil obligasi yang kaku.';
      preferredAsset = 'US30';
      playbookReason = 'Sektor finansial, energi, dan industri tradisional di Dow Jones 30 menarik aliran dana rotasi keluar dari saham bertumbuh.';
      yieldConditionTrigger = 'Kenaikan yield US10Y di atas 4.30% menekan P/E multiple US100 dan menguntungkan value stocks US30.';
    } else if (us100Change > 0.1 && us30Change > 0.1) {
      marketRotationRegime = 'BROAD_RALLY';
      regimeDescription = 'Reli pasar saham Wall Street menyeluruh didukung sentimen selera risiko tinggi (Risk-On) dan likuiditas global yang kondusif.';
      preferredAsset = us100Change >= us30Change ? 'US100' : 'US30';
      playbookReason = 'Seluruh indeks Wall Street bergerak positif seirama dengan pelemahan Dolar AS.';
      yieldConditionTrigger = 'DXY bergerak di bawah harga buka sesi mendukung akumulasi posisi Buy pada indeks ekuitas AS.';
    } else if (us100Change < -0.15 && us30Change < -0.15) {
      marketRotationRegime = 'BROAD_SELLOFF';
      regimeDescription = 'Aksi jual serentak pada indeks ekuitas AS di tengah keengganan risiko (Risk-Off) atau lonjakan volatilitas makro.';
      preferredAsset = 'NEUTRAL';
      playbookReason = 'Tekanan likuiditas membebani pasar saham; prioritaskan wait and see atau pantau batas support harian.';
      yieldConditionTrigger = 'Penembusan resisten yield US10Y atau penguatan tajam DXY memicu aksi de-risking.';
    } else {
      marketRotationRegime = 'BALANCED_ROTATION';
      regimeDescription = 'Indeks ekuitas AS bergerak stabil dan berkonsolidasi di sekitar harga pembukaan sesi. Belum terlihat rotasi sektoral ekstrem antara Growth dan Value.';
      preferredAsset = 'NEUTRAL';
      playbookReason = 'Keseimbangan intraday antara sektor teknologi dan saham siklikal; tunggu dorongan katalis data AS sesi New York.';
      yieldConditionTrigger = 'Pergerakan mendatar pada US10Y menjaga pergerakan indeks tetap dalam rentang konsolidasi.';
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
    let regimeBadgeColor = 'bg-cyan-950 text-cyan-300 border-cyan-800';
    let riskScore = 15;
    let summaryNarrative =
      'Aliran modal intraday berputar seimbang antar kelas aset. Tidak ada dominasi kepanikan atau euforia berlebih menjelang rilis data utama sesi berikutnya.';

    if (us10yChange > 0.4 && dxyChange > 0.2) {
      regimeTitle = 'HAWKISH YIELD PRESSURE';
      regimeBadgeColor = 'bg-amber-950 text-amber-300 border-amber-800';
      riskScore = -45;
      summaryNarrative =
        'Kenaikan imbal hasil obligasi AS dan penguatan DXY di atas harga buka sesi mendominasi arah pasar. Pasangan valuta non-USD dan aset berimbal hasil rendah tertekan.';
    } else if (sp500Change > 0.4 && dxyChange < -0.15) {
      regimeTitle = 'RISK-ON EXPANSION';
      regimeBadgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
      riskScore = +65;
      summaryNarrative =
        'Sentimen selera risiko tinggi. Dolar melemah seiring masuknya modal global ke pasar saham dan mata uang komoditas (AUD, CAD, NZD).';
    } else if (sp500Change < -0.5 && goldChange > 0.3) {
      regimeTitle = 'GLOBAL FLIGHT TO SAFETY';
      regimeBadgeColor = 'bg-rose-950 text-rose-300 border-rose-800';
      riskScore = -75;
      summaryNarrative =
        'Kekhawatiran geopolitik atau perlambatan makro memicu aksi jual saham dan perburuan aset safe-haven (Emas & Swiss Franc).';
    } else if (dxyChange < -0.3 && us10yChange < -0.5) {
      regimeTitle = 'DOVISH LIQUIDITY EASING';
      regimeBadgeColor = 'bg-indigo-950 text-indigo-300 border-indigo-800';
      riskScore = +35;
      summaryNarrative =
        'Pelemahan tajam imbal hasil obligasi AS dan Dolar membebaskan tekanan likuiditas global, memicu rebound pada Emas dan Valuta Mayor.';
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
        title: 'Anomali XAU/USD: Emas Gagal Naik Saat Dolar Melemah',
        description:
          'DXY mengalami pelemahan intraday, namun XAU/USD tidak mampu memanfaatkan pelemahan ini dan justru terkonsolidasi/melemah. Mengindikasikan tekanan jual internal atau real yield yang masih kaku.',
        affectedPairs: ['XAUUSD', 'EURUSD'],
        actionAdvice: 'Waspadai aksi jebakan beli (bull trap) pada Emas. Jangan buru-buru Buy sebelum harga menembus resisten kunci sesi.',
      });
    } else if (dxyChange > 0.2 && goldChange > 0.3) {
      anomalyAlerts.push({
        id: 'anomaly-gold-safe-haven',
        severity: 'WARNING',
        title: 'Divergensi Safe-Haven: Emas Reli Bersama Penguatan Dolar',
        description:
          'XAU/USD menguat bersamaan dengan naiknya Dolar AS. Ini adalah tanda khas lonjakan risiko geopolitik atau kepanikan likuiditas global di mana investor memborong instrumen pelindung nilai secara agresif.',
        affectedPairs: ['XAUUSD', 'US500'],
        actionAdvice: 'Prioritaskan manajemen risiko; reli emas didorong ketakutan eksternal, bukan sekadar transmisi kurs.',
      });
    }

    // Deteksi Anomali 2: USD/JPY vs Spread Imbal Hasil
    if (usJpSpread > 3.2 && (priceMap.get('JPY')?.change_24h_pct || 0) < -0.3) {
      anomalyAlerts.push({
        id: 'anomaly-usdjpy-intervention',
        severity: 'WARNING',
        title: 'USD/JPY Overextended vs Spread (Zona Sensitif Intervensi)',
        description:
          'Meskipun spread imbal hasil mendukung kenaikan, level harga saat ini berada di area intervensi verbal Kementerian Keuangan Jepang (MoF/BoJ).',
        affectedPairs: ['USDJPY'],
        actionAdvice: 'Batasi eksposur Buy panjang; siapkan stop loss ketat karena potensi ayunan intervensi sewaktu-waktu.',
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
          'Indeks saham teknologi menguat signifikan padahal yield US10Y melonjak tinggi. Biasanya lonjakan yield memicu kompresi kelipatan P/E.',
        affectedPairs: ['US100', 'US500'],
        actionAdvice: 'Waspadai potensi pembalikan mendadak saat sesi Wall Street dibuka penuh (Cash Open).',
      });
    }

    // Jika tidak ada anomali negatif, beri konfirmasi positif
    if (anomalyAlerts.length === 0) {
      anomalyAlerts.push({
        id: 'confluence-alignment-ok',
        severity: 'OPPORTUNITY',
        title: 'Konfirmasi Intermarket Selaras Normal',
        description:
          'Hubungan transmisi antara Dolar, Yields Obligasi AS, Valuta Mayor, dan Indeks Ekuitas saat ini berjalan seirama tanpa anomali struktural.',
        affectedPairs: ['EURUSD', 'USDJPY', 'XAUUSD', 'US100', 'US30'],
        actionAdvice: 'Fokus pada strategi trend-following searah dengan pembukaan sesi saat ini.',
      });
    }

    // 5. Matriks Pasangan Intraday (Triple-Confluence Synthesis)
    const targetPairs = [
      { pair: 'XAUUSD', name: 'Gold / US Dollar', tv: 'TVC:GOLD' },
      { pair: 'EURUSD', name: 'Euro / US Dollar', tv: 'FX:EURUSD' },
      { pair: 'GBPUSD', name: 'British Pound / USD', tv: 'FX:GBPUSD' },
      { pair: 'USDJPY', name: 'US Dollar / Japanese Yen', tv: 'FX:USDJPY' },
      { pair: 'US100', name: 'Nasdaq 100 Index', tv: 'SKILLING:US100' },
      { pair: 'US30', name: 'Dow Jones 30 Index', tv: 'FOREXCOM:US30' },
      { pair: 'US500', name: 'S&P 500 E-mini Index', tv: 'CAPITALCOM:SPX500' },
      { pair: 'AUDUSD', name: 'Australian Dollar / USD', tv: 'FX:AUDUSD' },
      { pair: 'USDCAD', name: 'US Dollar / Canadian Dollar', tv: 'FX:USDCAD' },
      { pair: 'BTC', name: 'Bitcoin / US Dollar', tv: 'BITSTAMP:BTCUSD' },
    ];

    const pairs: IntradayPairConfluence[] = targetPairs.map(tp => {
      const pObj = priceMap.get(tp.pair);
      const curPrice = pObj?.price || 0;
      const chg = pObj?.change_24h_pct || 0;
      const usdScore = strengthMap.get('USD')?.strength_score || 5.0;

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
          ? `${advLeader} (#${advRankL}, ${advScoreL.toFixed(1)}) Unggul +${diffAbs.toFixed(1)} atas ${advTrailer} (#${advRankT}, ${advScoreT.toFixed(1)})`
          : `${base} (#${bRank}, ${bScore.toFixed(1)}) vs ${quote} (#${qRank}, ${qScore.toFixed(1)}) Relatif Berimbang`;

        const summary = csBias === 'BULLISH'
          ? `Aliran modal valuta mengalir kuat ke ${base} dibanding ${quote} (Net CS: +${netDiff.toFixed(1)})`
          : csBias === 'BEARISH'
          ? `Dolar/Valuta lawan (${quote}) mendominasi kelemahan ${base} (Net CS: ${netDiff.toFixed(1)})`
          : `Kekuatan mata uang ${base} dan ${quote} berada dalam kisaran berimbang.`;

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
      let fundDriver = 'Data ekonomi AS memandu ekspektasi suku bunga The Fed';
      let fundScore = 0;

      let interBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let interSymptom = 'DXY bergerak moderat di sekitar harga buka sesi';
      let interScore = 0;

      let paBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let paStructure: 'SESSION_BREAKOUT' | 'RETEST_SUPPORT' | 'RETEST_RESISTANCE' | 'CHOP_RANGE' = 'CHOP_RANGE';
      let actionableZone = 'Amati batas support/resisten sesi';
      let paScore = 0;

      let recommendedAction: 'LOOK_FOR_BUY' | 'LOOK_FOR_SELL' | 'WAIT_ON_SUPPORT' | 'CAUTION_NO_TRADE' = 'WAIT_ON_SUPPORT';
      let invalidation = 'Penutupan candle H1 di luar level acuan';

      if (tp.pair === 'XAUUSD') {
        fundBias = usdScore > 5.2 ? 'BEARISH' : usdScore < 4.8 ? 'BULLISH' : 'NEUTRAL';
        fundDriver = 'Ekspektasi kebijakan suku bunga The Fed & premi lindung nilai geopolitik';
        fundScore = fundBias === 'BULLISH' ? 45 : fundBias === 'BEARISH' ? -40 : 0;

        interBias = realYield10y > 1.9 ? 'BEARISH' : realYield10y < 1.8 ? 'BULLISH' : (dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH');
        interSymptom = realYield10y > 1.9 ? `Real Yield 10Y tinggi (${realYield10y}%) menaikkan beban emas` : `Real Yield melandai (${realYield10y}%) membuka reli safe-haven`;
        interScore = interBias === 'BULLISH' ? 40 : -40;

        paBias = chg > 0.2 ? 'BULLISH' : chg < -0.2 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.3 ? 'SESSION_BREAKOUT' : chg < -0.3 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = chg > 0 ? 'Pullback ke demand sesi terdekat' : 'Uji area support sesi bawah';
        paScore = chg > 0.2 ? 35 : chg < -0.2 ? -35 : 0;

        if (fundBias === 'BULLISH' && interBias === 'BULLISH') {
          recommendedAction = 'LOOK_FOR_BUY';
          invalidation = 'Jika DXY breakout kuat ke atas session high';
        } else if (fundBias === 'BEARISH' && interBias === 'BEARISH') {
          recommendedAction = 'LOOK_FOR_SELL';
          invalidation = 'Jika yield US10Y anjlok di bawah level support intraday';
        } else {
          recommendedAction = 'WAIT_ON_SUPPORT';
          invalidation = 'Menunggu konfirmasi breakout sesi';
        }
      } else if (tp.pair === 'EURUSD') {
        const eurScore = strengthMap.get('EUR')?.strength_score || 5.0;
        fundBias = eurScore > usdScore + 0.1 ? 'BULLISH' : eurScore < usdScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Divergensi prospek moneter Bank Sentral Eropa (ECB) vs The Fed';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -45 : 0;

        interBias = dxyBiasVsOpen === 'ABOVE_OPEN' ? 'BEARISH' : 'BULLISH';
        interSymptom = `Spread US-DE di ${usDeSpread}% ${usDeSpread > 1.7 ? 'mendukung keunggulan Dolar' : 'kondusif bagi Euro'}`;
        interScore = interBias === 'BULLISH' ? 40 : -50;

        paBias = chg > 0.1 ? 'BULLISH' : chg < -0.1 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg < -0.2 ? 'SESSION_BREAKOUT' : chg > 0.2 ? 'SESSION_BREAKOUT' : 'CHOP_RANGE';
        actionableZone = chg < 0 ? 'Sell on rally di resisten terdekat' : 'Buy on dip di support sesi';
        paScore = chg > 0.1 ? 30 : chg < -0.1 ? -35 : 0;

        recommendedAction = interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'LOOK_FOR_BUY';
        invalidation = 'Breakout berlawanan pada DXY melintasi Session Open';
      } else if (tp.pair === 'GBPUSD') {
        const gbpScore = strengthMap.get('GBP')?.strength_score || 5.0;
        fundBias = gbpScore > usdScore + 0.1 ? 'BULLISH' : gbpScore < usdScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Arah suku bunga Bank of England (BoE) vs Fed dan persistensi inflasi jasa UK';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -40 : 0;

        interBias = dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `Korelasi terbalik dengan DXY (${dxyBiasVsOpen === 'BELOW_OPEN' ? 'DXY melemah menopang Cable' : 'DXY menguat menekan Cable'})`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = chg > 0.15 ? 'BULLISH' : chg < -0.15 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.25 ? 'SESSION_BREAKOUT' : chg < -0.25 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = chg > 0 ? 'Demand zone sesi London' : 'Supply zone batas atas sesi Asia-London';
        paScore = chg > 0.15 ? 30 : chg < -0.15 ? -30 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Penolakan pada level pivot harian GBPUSD';
      } else if (tp.pair === 'USDJPY') {
        const jpyScore = strengthMap.get('JPY')?.strength_score || 5.0;
        fundBias = usdScore >= jpyScore ? 'BULLISH' : 'BEARISH';
        fundDriver = 'Kesenjangan suku bunga ekstrim The Fed (~5%) vs suku bunga rendah Bank of Japan (~0.25%)';
        fundScore = fundBias === 'BULLISH' ? 55 : -40;

        // USDJPY berkorelasi POSITIF dengan DXY dan US-JP Yield Spread
        interBias = usJpSpread > 3.0 && dxyBiasVsOpen !== 'BELOW_OPEN' ? 'BULLISH' : (dxyBiasVsOpen === 'BELOW_OPEN' ? 'BEARISH' : 'NEUTRAL');
        interSymptom = `Yield spread AS-Jepang (${usJpSpread}%) & DXY ${dxyBiasVsOpen === 'ABOVE_OPEN' ? 'menguat' : 'tertekan'} memandu insentif carry trade`;
        interScore = interBias === 'BULLISH' ? 50 : -40;

        paBias = chg > 0.1 ? 'BULLISH' : chg < -0.1 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : 'RETEST_RESISTANCE';
        actionableZone = 'Pantau reaksi harga di dekat level psikologis angka bulat';
        paScore = chg > 0 ? 35 : -30;

        recommendedAction = interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : 'WAIT_ON_SUPPORT';
        invalidation = 'Sinyal intervensi verbal pejabat MoF/BoJ atau pembalikan tajam DXY';
      } else if (tp.pair === 'US100') {
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;
        fundBias = us10yChange > 0.25 ? 'BEARISH' : us10yChange < -0.2 ? 'BULLISH' : (isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL');
        fundDriver = 'Sensitivitas valuasi teknologi & AI terhadap yield diskonto US 10-Year Treasury';
        fundScore = fundBias === 'BULLISH' ? 45 : fundBias === 'BEARISH' ? -45 : 0;

        interBias = realYield10y > 1.95 ? 'BEARISH' : realYield10y < 1.85 ? 'BULLISH' : (dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH');
        interSymptom = `Real Yield 10Y di ${realYield10y}% ${realYield10y > 1.95 ? 'menekan P/E multiples teknologi' : 'kondusif untuk valuasi saham bertumbuh'}`;
        interScore = interBias === 'BULLISH' ? 40 : -40;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.3 ? 'SESSION_BREAKOUT' : chg < -0.3 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = isUp ? 'Area demand breakout pembukaan sesi New York' : 'Support kunci intraday Nasdaq';
        paScore = isUp ? 35 : isDown ? -35 : 0;

        if (fundBias === 'BULLISH' && interBias === 'BULLISH') {
          recommendedAction = 'LOOK_FOR_BUY';
          invalidation = 'Jika yield US10Y melonjak melampaui resisten sesi';
        } else if (fundBias === 'BEARISH' && interBias === 'BEARISH') {
          recommendedAction = 'LOOK_FOR_SELL';
          invalidation = 'Jika DXY anjlok di bawah session open';
        } else {
          recommendedAction = 'WAIT_ON_SUPPORT';
          invalidation = 'Tunggu rilis data makro / pembukaan sesi Wall Street';
        }
      } else if (tp.pair === 'US30') {
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;
        fundBias = us10yMinusUs02y > 0 ? 'BULLISH' : 'NEUTRAL';
        fundDriver = 'Kesehatan aktivitas industri, laba perbankan & saham siklikal Dow 30';
        fundScore = isUp ? 40 : isDown ? -40 : 15;

        interBias = us10yMinusUs02y > 0 ? 'BULLISH' : 'BEARISH';
        interSymptom = `Kurva imbal hasil US10Y-US02Y (${us10yMinusUs02y > 0 ? 'steepening' : 'inversi'}) memandu sektor finansial Dow`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : chg < -0.2 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = 'Area angka bulat psikologis Dow 30 & batas sesi London-NY';
        paScore = isUp ? 30 : isDown ? -30 : 0;

        recommendedAction = isUp && interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : isDown && interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Penolakan keras (rejection) pada level support/resisten harian';
      } else if (tp.pair === 'US500') {
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;
        fundBias = us10yChange > 0.35 ? 'BEARISH' : (isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL');
        fundDriver = 'Barometer agregat laba 500 korporasi AS dan ekspektasi likuiditas moneter makro';
        fundScore = isUp ? 40 : isDown ? -40 : 0;

        interBias = dxyBiasVsOpen === 'BELOW_OPEN' && us10yChange <= 0.2 ? 'BULLISH' : (dxyBiasVsOpen === 'ABOVE_OPEN' && us10yChange > 0.2 ? 'BEARISH' : 'NEUTRAL');
        interSymptom = `DXY ${dxyBiasVsOpen === 'BELOW_OPEN' ? 'melemah menopang ekuitas' : 'menguat menekan laba multinasional'} & yield 10Y di ${us10yPrice}%`;
        interScore = interBias === 'BULLISH' ? 35 : interBias === 'BEARISH' ? -35 : 0;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.25 ? 'SESSION_BREAKOUT' : chg < -0.25 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = isUp ? 'Demand zone pembukaan Wall Street' : 'Retest support S&P 500';
        paScore = isUp ? 30 : isDown ? -30 : 0;

        recommendedAction = isUp && interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : isDown && interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Pembalikan tajam menembus support sesi harian';
      } else if (tp.pair === 'AUDUSD') {
        const audScore = strengthMap.get('AUD')?.strength_score || 5.0;
        fundBias = audScore > usdScore + 0.1 ? 'BULLISH' : audScore < usdScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Divergensi suku bunga RBA vs Fed dan proyeksi permintaan komoditas ekspor Australia';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -40 : 0;

        // AUDUSD berbanding terbalik dengan DXY dan searah dengan sentimen komoditas/risk-on
        interBias = dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `Korelasi terbalik dengan DXY & transmisi sentimen selera risiko (Risk-On/Off) komoditas`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = chg > 0.15 ? 'BULLISH' : chg < -0.15 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : chg < -0.2 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = 'Batas atas/bawah range sesi Asia-Pasifik';
        paScore = chg > 0.15 ? 30 : chg < -0.15 ? -30 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Breakout palsu pada level pembukaan sesi London';
      } else if (tp.pair === 'USDCAD') {
        // PERHATIAN: USD adalah Base Currency, CAD adalah Quote Currency!
        const cadScore = strengthMap.get('CAD')?.strength_score || 5.0;
        fundBias = usdScore > cadScore + 0.1 ? 'BULLISH' : usdScore < cadScore - 0.1 ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Divergensi suku bunga Bank of Canada (BoC) vs The Fed dan transmisi sektor energi Kanada';
        fundScore = fundBias === 'BULLISH' ? 40 : fundBias === 'BEARISH' ? -40 : 0;

        // USDCAD berkorelasi SEARAH/POSITIF dengan DXY! (Dolar naik -> USDCAD naik)
        interBias = dxyBiasVsOpen === 'ABOVE_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `Korelasi langsung dengan DXY (USD Base) & transmisi nilai tukar petro-currency CAD`;
        interScore = interBias === 'BULLISH' ? 35 : -35;

        paBias = chg > 0.1 ? 'BULLISH' : chg < -0.1 ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 0.2 ? 'SESSION_BREAKOUT' : chg < -0.2 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = 'Zona reaksi rilis data makro bersama AS-Kanada (sesi New York)';
        paScore = chg > 0.1 ? 30 : chg < -0.1 ? -30 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Lonjakan tajam harga minyak mentah yang menguatkan Dolar Kanada secara tiba-tiba';
      } else if (tp.pair === 'BTC') {
        const isUp = chg > 0.5;
        const isDown = chg < -0.5;
        fundBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Likuiditas moneter global (M2), arus modal spot ETF institusional & selera risiko kripto';
        fundScore = isUp ? 45 : isDown ? -45 : 0;

        // BTC berkorelasi TERBALIK dengan DXY & Real Yields, searah dengan saham teknologi US100
        interBias = dxyBiasVsOpen === 'BELOW_OPEN' && realYield10y < 1.9 ? 'BULLISH' : (dxyBiasVsOpen === 'ABOVE_OPEN' ? 'BEARISH' : 'NEUTRAL');
        interSymptom = `Aset likuiditas beta tinggi (korelasi terbalik terhadap DXY & searah dengan sentimen US100)`;
        interScore = interBias === 'BULLISH' ? 40 : interBias === 'BEARISH' ? -40 : 0;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = chg > 1.0 ? 'SESSION_BREAKOUT' : chg < -1.0 ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = 'Level psikologis angka bulat ribuan Dolar & likuiditas leverage derivatif';
        paScore = isUp ? 35 : isDown ? -35 : 0;

        recommendedAction = interBias === 'BULLISH' && paBias === 'BULLISH' ? 'LOOK_FOR_BUY' : interBias === 'BEARISH' && paBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Penembusan level support likuiditas harian Bitcoin';
      } else {
        // Fallback generik
        const isUp = chg > 0.1;
        const isDown = chg < -0.1;

        fundBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        fundDriver = 'Sentimen likuiditas global dan sentimen selera risiko harian';
        fundScore = isUp ? 30 : isDown ? -30 : 0;

        interBias = dxyBiasVsOpen === 'BELOW_OPEN' ? 'BULLISH' : 'BEARISH';
        interSymptom = `DXY berada ${dxyBiasVsOpen === 'ABOVE_OPEN' ? 'di atas' : 'di bawah'} harga buka sesi`;
        interScore = interBias === 'BULLISH' ? 25 : -25;

        paBias = isUp ? 'BULLISH' : isDown ? 'BEARISH' : 'NEUTRAL';
        paStructure = isUp ? 'SESSION_BREAKOUT' : isDown ? 'RETEST_SUPPORT' : 'CHOP_RANGE';
        actionableZone = isUp ? 'Area pullback demand' : 'Area retracement supply';
        paScore = isUp ? 25 : isDown ? -25 : 0;

        recommendedAction = isUp && interBias === 'BULLISH' ? 'LOOK_FOR_BUY' : isDown && interBias === 'BEARISH' ? 'LOOK_FOR_SELL' : 'WAIT_ON_SUPPORT';
        invalidation = 'Pembalikan arah harga menembus level pembukaan sesi';
      }

      // Hitung Confluence Status & Conviction Score
      const biases = [fundBias, interBias, paBias];
      if (currencyStrengthConfluence && currencyStrengthConfluence.bias !== 'NEUTRAL') {
        biases.push(currencyStrengthConfluence.bias);
      }
      const bullishCount = biases.filter(b => b === 'BULLISH').length;
      const bearishCount = biases.filter(b => b === 'BEARISH').length;
      const totalPillars = biases.length; // 4 untuk Forex dengan bias jelas, 3 untuk lainnya

      let directionalBias: IntradayPairConfluence['directionalBias'] = 'NEUTRAL';
      let confluenceStatus: IntradayPairConfluence['confluenceStatus'] = 'NEUTRAL_CHOP';
      let convictionScore = 50;

      const hasCsDivergence = currencyStrengthConfluence?.alignment === 'DIVERGENCE';

      if (bullishCount === totalPillars) {
        directionalBias = 'STRONG_BULLISH';
        confluenceStatus = 'HIGH_CONVICTION';
        convictionScore = totalPillars === 4 ? 96 : 92;
      } else if (bearishCount === totalPillars) {
        directionalBias = 'STRONG_BEARISH';
        confluenceStatus = 'HIGH_CONVICTION';
        convictionScore = totalPillars === 4 ? 96 : 92;
      } else if (bullishCount >= (totalPillars === 4 ? 3 : 2) && !hasCsDivergence) {
        directionalBias = 'BULLISH';
        confluenceStatus = bullishCount === 3 && totalPillars === 4 ? 'HIGH_CONVICTION' : 'MODERATE';
        convictionScore = bullishCount === 3 && totalPillars === 4 ? 85 : 75;
      } else if (bearishCount >= (totalPillars === 4 ? 3 : 2) && !hasCsDivergence) {
        directionalBias = 'BEARISH';
        confluenceStatus = bearishCount === 3 && totalPillars === 4 ? 'HIGH_CONVICTION' : 'MODERATE';
        convictionScore = bearishCount === 3 && totalPillars === 4 ? 85 : 75;
      } else if (hasCsDivergence || (paBias !== 'NEUTRAL' && (fundBias !== paBias && interBias !== paBias))) {
        // Price action melawan fundamental/intermarket atau melawan Currency Strength
        directionalBias = paBias === 'BULLISH' ? 'BULLISH' : 'BEARISH';
        confluenceStatus = 'CAUTION_TRAP';
        convictionScore = 40;
        recommendedAction = 'CAUTION_NO_TRADE';
      } else {
        directionalBias = 'NEUTRAL';
        confluenceStatus = 'NEUTRAL_CHOP';
        convictionScore = 50;
      }

      const csWarning = hasCsDivergence
        ? `Waspada Divergensi CS: Aksi harga tidak didukung oleh selisih kekuatan mata uang (${currencyStrengthConfluence?.advantageLabel}). Potensi Fakeout!`
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
          warningNote: csWarning || (confluenceStatus === 'CAUTION_TRAP' ? 'Waspadai jebakan likuiditas; pergerakan harga tidak didukung pilar makro/intermarket.' : undefined),
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

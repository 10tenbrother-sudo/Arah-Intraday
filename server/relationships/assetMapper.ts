/**
 * Asset & Currency Relationship Mapping Engine
 * Deterministic mapping based on macroeconomic causality and asset sensitivity
 */

import { PairImpact } from '../types.js';

export interface MappedRelationship {
  affected_assets: string[];
  affected_currencies: string[];
  primary_category: 'MACRO' | 'CENTRAL_BANK' | 'COMMODITY' | 'CRYPTO' | 'EQUITIES' | 'GEOPOLITICS' | 'MICRO';
  impact_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  key_facts: string[];
  pair_impacts: PairImpact[];
}

/**
 * Calculates deterministic directional bias (BULLISH vs BEARISH vs NEUTRAL)
 * and causal transmission rationale for every affected pair or asset.
 */
export function calculatePairImpacts(
  title: string,
  content: string,
  category: string,
  affectedAssets: string[],
  affectedCurrencies: string[]
): PairImpact[] {
  const text = `${title} ${content}`.toLowerCase();
  const impacts: PairImpact[] = [];

  // Macro & Sentiment Signals
  const isHawkish = /hike|raise rate|hawkish|sticky inflation|inflation surge|cpi beat|strong jobs|hotter|higher for longer|delay cut|hold rate|tightening|fed intensif/i.test(text);
  const isDovish = /cut|rate cut|dovish|cool inflation|easing|softening|unemployment rose|jobless claims surge|miss|lower rate|trim rate|recession|slowdown|pce drop/i.test(text);
  const isGeopolitical = /war|conflict|missile|strike|attack|blast|explosion|soldiers hurt|military|demarcation|casualt|hostilities|escalat|iran|israel|russia|ukraine|korea|taiwan|crisis|sanctions/i.test(text);
  const isBankingRisk = /bank risk|trading firm|loss|losses|collapse|bailout|default|scrutiny|probe|regulat|contagion|credit risk|jane street/i.test(text);
  const isOilShock = /crude|oil|opec|wti|brent|petroleum|minyak/i.test(text);
  const isCryptoBullish = /etf inflow|record high|approval|sec win|adoption|halving|bull run/i.test(text);
  const isCryptoBearish = /ban|hack|sec lawsuit|crackdown|fraud|outflow/i.test(text);
  const isBojHawkish = /boj rate hike|ueda rate|yen intervention|boj hike|boj tightening|japan cpi beat|intervensi yen/i.test(text);
  const isBoeHawkish = /boe hike|bailey hawkish|uk cpi high|uk inflation jump/i.test(text);
  const isEcbHawkish = /ecb hike|lagarde hawkish|eurozone cpi beat/i.test(text);

  // 1. XAUUSD (Gold)
  if (affectedAssets.includes('XAUUSD') || affectedCurrencies.includes('USD') || isGeopolitical || category === 'COMMODITY') {
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'BULLISH';
    let strength: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MILD' = 'HIGH';
    let mechanism = 'Safe-Haven Capital Inflow';
    let rationale = 'Escalating tensions and a global risk premium push safe-haven capital flows into bullion.';

    if (isGeopolitical || isBankingRisk) {
      bias = 'BULLISH';
      strength = 'CRITICAL';
      mechanism = 'Geopolitical / Counterparty Risk Hedge';
      rationale = 'Gold is bid as the primary hedge against military escalation and bank default risk.';
    } else if (isDovish) {
      bias = 'BULLISH';
      strength = 'HIGH';
      mechanism = 'Real Yield Compression';
      rationale = 'Expectations of Fed rate cuts and a softer dollar reduce the opportunity cost of holding gold.';
    } else if (isHawkish && !isGeopolitical) {
      bias = 'BEARISH';
      strength = 'HIGH';
      mechanism = 'Real Yield Expansion';
      rationale = 'High US policy rates and a firm DXY curb the appeal of non-yielding assets such as gold.';
    } else {
      bias = 'BULLISH';
      strength = 'MODERATE';
      mechanism = 'Central Bank Allocation Demand';
      rationale = 'Continued central-bank gold accumulation cushions the structural uptrend.';
    }

    impacts.push({
      pair: 'XAUUSD',
      displayName: 'Gold / US Dollar',
      bias,
      strength,
      mechanism,
      rationale,
      confidence: 0.92,
    });
  }

  // 2. EURUSD
  if (affectedCurrencies.includes('EUR') || affectedCurrencies.includes('USD')) {
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MILD' = 'MODERATE';
    let mechanism = 'Fed-ECB Rate Spread';
    let rationale = 'Macro sentiment shapes the policy rate differential between the ECB and the Fed.';

    if (isEcbHawkish) {
      bias = 'BULLISH';
      strength = 'HIGH';
      mechanism = 'ECB Tightening Differential';
      rationale = 'Hawkish ECB rhetoric narrows the rate gap with the Fed, giving the euro a bullish push.';
    } else if (isDovish) {
      bias = 'BULLISH';
      strength = 'HIGH';
      mechanism = 'USD Liquidity Easing';
      rationale = 'A softer dollar index, driven by Fed rate-cut prospects, lifts EUR/USD.';
    } else if (isHawkish) {
      bias = 'BEARISH';
      strength = 'HIGH';
      mechanism = 'USD Yield Dominance';
      rationale = 'Superior US Treasury yields pull capital into the dollar, pressuring EUR/USD.';
    } else if (isGeopolitical) {
      bias = 'BEARISH';
      strength = 'MODERATE';
      mechanism = 'European Risk-Off Drag';
      rationale = 'Global geopolitical uncertainty triggers a flight to safety into the dollar over the euro.';
    }

    impacts.push({
      pair: 'EURUSD',
      displayName: 'Euro / US Dollar',
      bias,
      strength,
      mechanism,
      rationale,
      confidence: 0.88,
    });
  }

  // 3. GBPUSD
  if (affectedCurrencies.includes('GBP')) {
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MILD' = 'MODERATE';
    let mechanism = 'BoE Monetary Policy Divergence';
    let rationale = 'GBP direction is guided by the Bank of England rate path versus the Federal Reserve.';

    if (isBoeHawkish) {
      bias = 'BULLISH';
      strength = 'HIGH';
      mechanism = 'Gilt Yield Support';
      rationale = 'Sticky UK inflation forces the BoE to stay hawkish, supporting Cable (GBP/USD).';
    } else if (isDovish) {
      bias = 'BULLISH';
      strength = 'MODERATE';
      mechanism = 'USD Softness';
      rationale = 'Broad dollar weakness gives the pound room to appreciate.';
    } else if (isHawkish || isBankingRisk) {
      bias = 'BEARISH';
      strength = 'MODERATE';
      mechanism = 'USD Superiority & Bank Scrutiny';
      rationale = 'Banking risk scrutiny and a robust dollar weigh on the GBP/USD valuation.';
    }

    impacts.push({
      pair: 'GBPUSD',
      displayName: 'British Pound / US Dollar',
      bias,
      strength,
      mechanism,
      rationale,
      confidence: 0.85,
    });
  }

  // 4. USDJPY
  if (affectedCurrencies.includes('JPY') || isGeopolitical || affectedCurrencies.includes('USD')) {
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MILD' = 'MODERATE';
    let mechanism = 'US-Japan Bond Yield Gap';
    let rationale = 'Sensitivity to the US-Japan 10-year Treasury spread drives USD/JPY dynamics.';

    if (isBojHawkish) {
      bias = 'BEARISH';
      strength = 'CRITICAL';
      mechanism = 'Carry Trade Unwind / BoJ Normalization';
      rationale = 'Prospects of a BoJ hike or FX intervention trigger carry-trade liquidation, sharply strengthening the yen (USDJPY falls).';
    } else if (isGeopolitical) {
      bias = 'BEARISH';
      strength = 'HIGH';
      mechanism = 'Yen Safe-Haven Inflow';
      rationale = 'Global risk aversion drives Japanese institutional capital back into the yen.';
    } else if (isDovish) {
      bias = 'BEARISH';
      strength = 'HIGH';
      mechanism = 'Narrowing Yield Spread';
      rationale = 'Falling US yields narrow the US-Japan rate gap, capping USD/JPY.';
    } else if (isHawkish) {
      bias = 'BULLISH';
      strength = 'HIGH';
      mechanism = 'Carry Trade Widening';
      rationale = 'High Fed rates widen the carry advantage of the dollar over the low-yielding yen.';
    }

    impacts.push({
      pair: 'USDJPY',
      displayName: 'US Dollar / Japanese Yen',
      bias,
      strength,
      mechanism,
      rationale,
      confidence: 0.90,
    });
  }

  // 5. USDCHF
  if (affectedCurrencies.includes('CHF') || isGeopolitical) {
    const isChfBullish = isGeopolitical || isDovish;
    impacts.push({
      pair: 'USDCHF',
      displayName: 'US Dollar / Swiss Franc',
      bias: isChfBullish ? 'BEARISH' : 'BULLISH',
      strength: isGeopolitical ? 'HIGH' : 'MODERATE',
      mechanism: isGeopolitical ? 'Swiss Safe-Haven Allocation' : 'Rate Differential',
      rationale: isGeopolitical
        ? 'The Swiss franc is bid as a haven for European geopolitical crises, pushing USD/CHF lower.'
        : 'Divergence between Fed and SNB policy drives USD/CHF swings.',
      confidence: 0.86,
    });
  }

  // 6. AUDUSD
  if (affectedCurrencies.includes('AUD') || affectedCurrencies.includes('NZD')) {
    const isAudBullish = isDovish && !isGeopolitical;
    impacts.push({
      pair: 'AUDUSD',
      displayName: 'Australian Dollar / USD',
      bias: isAudBullish ? 'BULLISH' : (isGeopolitical || isHawkish ? 'BEARISH' : 'NEUTRAL'),
      strength: 'MODERATE',
      mechanism: 'Commodity Growth Proxy',
      rationale: isAudBullish
        ? 'Fed easing lifts risk appetite and the outlook for Australian commodity exports.'
        : 'Risk-off sentiment and a firmer dollar pressure pro-cyclical currencies such as the Australian dollar.',
      confidence: 0.84,
    });
  }

  // 7. USDCAD
  if (affectedCurrencies.includes('CAD') || isOilShock) {
    const isOilPlunge = /slid|lowest|plunge|drop|fall|tumble|turun|anjlok/i.test(text);
    const isOilSurge = /surge|spike|jump|soar|rally|naik|melonjak/i.test(text);
    let cadBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let cadRationale = 'Dollar sentiment and crude oil price stability govern the USDCAD trading range.';

    if (isOilPlunge) {
      cadBias = 'BULLISH'; // USDCAD rises because CAD weakens
      cadRationale = 'A sharp crude oil decline hurts Canada\'s trade balance, driving CAD depreciation and USDCAD higher.';
    } else if (isOilSurge) {
      cadBias = 'BEARISH'; // USDCAD falls because CAD strengthens
      cadRationale = 'An energy price spike strengthens Canada\'s trade balance, boosting CAD and pushing USDCAD down.';
    } else if (isDovish) {
      cadBias = 'BEARISH';
      cadRationale = 'A softer DXY on Fed rate-cut prospects pressures USDCAD lower.';
    } else if (isHawkish) {
      cadBias = 'BULLISH';
      cadRationale = 'DXY strength and high US Treasury yields support USDCAD upside.';
    }

    impacts.push({
      pair: 'USDCAD',
      displayName: 'US Dollar / Canadian Dollar',
      bias: cadBias,
      strength: isOilShock ? 'HIGH' : 'MODERATE',
      mechanism: 'Crude Oil Terms-of-Trade',
      rationale: cadRationale,
      confidence: 0.88,
    });
  }

  // 8. US100 & US500 (Equities)
  if (affectedAssets.includes('US100') || affectedAssets.includes('US500') || affectedAssets.includes('US30')) {
    let eqBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let eqStrength: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MILD' = 'MODERATE';
    let eqMech = 'Discount Rate & Earnings Multiples';
    let eqRat = 'Equity valuations react to expected capital costs and discount rates.';

    if (isDovish) {
      eqBias = 'BULLISH';
      eqStrength = 'HIGH';
      eqMech = 'Cost of Capital Compression';
      eqRat = 'Lower rates support P/E multiple expansion and liquidity for technology issuers.';
    } else if (isGeopolitical || isBankingRisk) {
      eqBias = 'BEARISH';
      eqStrength = 'HIGH';
      eqMech = 'Equity Risk Premium Shock';
      eqRat = 'Geopolitical uncertainty and tighter banking risk controls trigger profit-taking in index equities.';
    } else if (isHawkish) {
      eqBias = 'BEARISH';
      eqStrength = 'HIGH';
      eqMech = 'Multiple Compression';
      eqRat = 'High Treasury yields offer a low-risk alternative, weighing on equities.';
    }

    impacts.push({
      pair: 'US100',
      displayName: 'Nasdaq 100 Index',
      bias: eqBias,
      strength: eqStrength,
      mechanism: eqMech,
      rationale: eqRat,
      confidence: 0.89,
    });

    if (affectedAssets.includes('US30') || isBankingRisk) {
      impacts.push({
        pair: 'US30',
        displayName: 'Dow Jones 30',
        bias: isBankingRisk ? 'BEARISH' : eqBias,
        strength: isBankingRisk ? 'HIGH' : eqStrength,
        mechanism: isBankingRisk ? 'Financial Sector Headwind' : eqMech,
        rationale: isBankingRisk
          ? 'Banking-sector and trading-desk risk headlines weigh on the Dow Jones bank constituents.'
          : eqRat,
        confidence: 0.88,
      });
    }
  }

  // 9. BTC (Bitcoin)
  if (affectedAssets.includes('BTC') || category === 'CRYPTO') {
    let btcBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let btcStrength: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MILD' = 'MODERATE';
    let btcMech = 'Global Monetary Liquidity Flow';
    let btcRat = 'Bitcoin acts as a barometer of global liquidity and institutional risk appetite.';

    if (isCryptoBullish || isDovish) {
      btcBias = 'BULLISH';
      btcStrength = 'HIGH';
      btcMech = 'Fiat Debasement & Liquidity Injection';
      btcRat = 'Global monetary easing and institutional adoption fuel Bitcoin\'s upside momentum.';
    } else if (isCryptoBearish || isHawkish) {
      btcBias = 'BEARISH';
      btcStrength = 'HIGH';
      btcMech = 'Liquidity Drain';
      btcRat = 'High risk-free yields hold back speculative flows into digital assets.';
    } else if (isBankingRisk) {
      btcBias = 'BULLISH';
      btcStrength = 'MODERATE';
      btcMech = 'Decentralized Sovereign Alternative';
      btcRat = 'Fragility in traditional banking drives some funds to rotate into non-custodial digital assets.';
    }

    impacts.push({
      pair: 'BTC',
      displayName: 'Bitcoin / US Dollar',
      bias: btcBias,
      strength: btcStrength,
      mechanism: btcMech,
      rationale: btcRat,
      confidence: 0.87,
    });
  }

  // Deduplicate pairs in impacts list
  const seen = new Set<string>();
  const uniqueImpacts = impacts.filter(item => {
    if (seen.has(item.pair)) return false;
    seen.add(item.pair);
    return true;
  });

  return uniqueImpacts;
}

export function analyzeAssetRelationships(title: string, content: string): MappedRelationship {
  const text = `${title} ${content}`.toLowerCase();

  const affected_assets = new Set<string>();
  const affected_currencies = new Set<string>();
  let primary_category: MappedRelationship['primary_category'] = 'MACRO';
  let impact_level: MappedRelationship['impact_level'] = 'MEDIUM';
  const key_facts: string[] = [];

  // 1. Extract numeric facts (e.g., 3.1%, 25 bps, $2700, 142k)
  const percentMatches = text.match(/\b\d+([.,]\d+)?\s*%/g);
  if (percentMatches) {
    key_facts.push(...percentMatches.slice(0, 3).map(p => `Rate/Delta: ${p.trim()}`));
  }

  const bpsMatches = text.match(/\b\d+\s*bps\b/gi);
  if (bpsMatches) {
    key_facts.push(...bpsMatches.slice(0, 2).map(b => `Shift: ${b.trim()}`));
  }

  // 2. US Macro & Federal Reserve
  const isUsInflation = /cpi|inflation|inflasi|ihk|consumer price|indeks harga konsumen|ppi|pce/i.test(text);
  const isUsFed = /fed|federal reserve|fomc|powell|suku bunga as|us interest rate|rate cut|pemangkasan suku bunga/i.test(text);
  const isUsJobs = /nfp|non-farm|payroll|tenaga kerja as|us employment|jobless claims|unemployment as/i.test(text);
  const isUsGdp = /gdp as|us gdp|pertumbuhan ekonomi as/i.test(text);

  if (isUsInflation || isUsFed || isUsJobs || isUsGdp) {
    affected_currencies.add('USD');
    affected_assets.add('US10Y');  // Sovereign benchmark discount rate
    affected_assets.add('XAUUSD'); // Gold is inverse USD / real yield sensitive
    affected_assets.add('US100');  // Tech equities are rate discount sensitive
    affected_assets.add('US500');  // Broad market equity proxy
    affected_assets.add('US30');   // Industrial benchmark
    affected_assets.add('BTC');    // High-beta liquidity barometer

    if (isUsInflation) {
      primary_category = 'MACRO';
      impact_level = 'HIGH';
      key_facts.push('US Inflation Print / Macro Indicator');
    } else if (isUsFed) {
      primary_category = 'CENTRAL_BANK';
      impact_level = 'CRITICAL';
      key_facts.push('Federal Reserve Monetary Policy Action');
    } else if (isUsJobs) {
      primary_category = 'MACRO';
      impact_level = 'CRITICAL';
      key_facts.push('US Labor Market Release');
    }
  }

  // 3. European Central Bank & Euro
  if (/ecb|lagarde|european central bank|bank sentral eropa|eurozone|inflasi eropa|german pmi/i.test(text)) {
    affected_currencies.add('EUR');
    affected_currencies.add('USD');
    affected_assets.add('US500');
    primary_category = 'CENTRAL_BANK';
    impact_level = 'HIGH';
    key_facts.push('ECB Policy / Eurozone Economic Driver');
  }

  // 4. Bank of Japan & Yen
  if (/boj|bank of japan|bank sentral jepang|ueda|yen|jpy|intervensi yen|tokyo cpi/i.test(text)) {
    affected_currencies.add('JPY');
    affected_currencies.add('USD');
    affected_assets.add('US100'); // Carry trade unwinding sensitivity
    affected_assets.add('XAUUSD');
    primary_category = 'CENTRAL_BANK';
    impact_level = 'HIGH';
    key_facts.push('Bank of Japan Policy / Carry Trade Dynamics');
  }

  // 5. Bank of England & Sterling
  if (/boe|bank of england|bailey|sterling|gbp|uk cpi|inflasi inggris|gilts/i.test(text)) {
    affected_currencies.add('GBP');
    affected_currencies.add('USD');
    primary_category = 'CENTRAL_BANK';
    impact_level = 'HIGH';
    key_facts.push('Bank of England / UK Economic Activity');
  }

  // 6. Commodity Currencies (AUD, NZD, CAD)
  if (/rba|reserve bank of australia|aud|australia|china trade|dolar australia/i.test(text)) {
    affected_currencies.add('AUD');
    affected_currencies.add('USD');
    affected_currencies.add('NZD');
    affected_assets.add('XAUUSD'); // AUD strongly correlated with commodities
    primary_category = 'MACRO';
    key_facts.push('Australia / Asia-Pacific Growth Exposure');
  }

  if (/rbnz|reserve bank of new zealand|nzd|new zealand/i.test(text)) {
    affected_currencies.add('NZD');
    affected_currencies.add('AUD');
    affected_currencies.add('USD');
    primary_category = 'CENTRAL_BANK';
  }

  if (/boc|bank of canada|cad|kanada|crude oil|minyak mentah|opec|wti|brent/i.test(text)) {
    affected_currencies.add('CAD');
    affected_currencies.add('USD');
    affected_assets.add('US30');
    if (/oil|minyak|opec/i.test(text)) {
      primary_category = 'COMMODITY';
      impact_level = /slid|lowest|plunge|drop|surge|spike|shock|crisis|embargo/i.test(text) ? 'CRITICAL' : 'HIGH';
      key_facts.push('Energy Market / Petroleum Supply-Demand Shock');
    }
  }

  // 6.5. Systemic Banking, Hedge Fund & Trading Counterparty Risk
  if (/bank risk|trading firm|losses|collapse|bailout|default|contagion|credit risk|liquidity crisis|jane street|hedge fund/i.test(text)) {
    affected_assets.add('US30');
    affected_assets.add('US100');
    affected_assets.add('XAUUSD');
    affected_currencies.add('USD');
    primary_category = 'MACRO';
    impact_level = 'CRITICAL';
    key_facts.push('Systemic Banking / Counterparty Liquidity Risk');
  }

  // 6.6. Trade Policy, Tariffs & Trade Wars
  if (/tariff|trade war|tariffs|sanksi dagang|embargo|trade restriction/i.test(text)) {
    affected_assets.add('US100');
    affected_assets.add('US500');
    affected_currencies.add('USD');
    primary_category = 'MACRO';
    impact_level = 'HIGH';
    key_facts.push('Trade Policy / Tariff Disruption');
  }

  // 7. Swiss Franc & Safe Haven
  if (/snb|swiss national bank|chf|franc|safe haven|aset lindung nilai/i.test(text)) {
    affected_currencies.add('CHF');
    affected_currencies.add('EUR');
    affected_currencies.add('USD');
    affected_assets.add('XAUUSD');
    primary_category = 'MACRO';
    if (/intervention|rate cut|rate hike|crisis/i.test(text)) {
      impact_level = 'HIGH';
    }
  }

  // 8. Gold & Precious Metals
  if (/gold|xau|emas|bullion|logam mulia|precious metal/i.test(text)) {
    affected_assets.add('XAUUSD');
    affected_currencies.add('USD');
    primary_category = 'COMMODITY';
    impact_level = 'HIGH';
    key_facts.push('Gold Bullion Physical / Speculative Shift');
  }

  // 9. Crypto & Bitcoin
  if (/bitcoin|btc|crypto|kripto|sec btc|etf crypto|ethereum|tether/i.test(text)) {
    affected_assets.add('BTC');
    affected_assets.add('US100');
    affected_currencies.add('USD');
    primary_category = 'CRYPTO';
    impact_level = 'MEDIUM';
    key_facts.push('Digital Asset / Crypto Liquidity Event');
  }

  // 10. Geopolitics & Defense
  if (/war|perang|missile|rudal|military|militer|sanctions|sanksi|middle east|timur tengah|iran|israel|russia|ukraine|korea/i.test(text)) {
    affected_assets.add('XAUUSD');
    affected_assets.add('US30');
    affected_currencies.add('USD');
    affected_currencies.add('CHF');
    affected_currencies.add('JPY');
    primary_category = 'GEOPOLITICS';
    impact_level = 'CRITICAL';
    key_facts.push('Geopolitical Tensions / Flight to Safety');
  }

  // Default fallback if no specific rule matched
  if (affected_assets.size === 0 && affected_currencies.size === 0) {
    affected_assets.add('US500');
    affected_currencies.add('USD');
    primary_category = 'MICRO';
    impact_level = 'LOW';
  }

  const assetsArr = Array.from(affected_assets);
  const currenciesArr = Array.from(affected_currencies);

  // Compute rich pair impacts and directional biases
  const pair_impacts = calculatePairImpacts(
    title,
    content,
    primary_category,
    assetsArr,
    currenciesArr
  );

  return {
    affected_assets: assetsArr,
    affected_currencies: currenciesArr,
    primary_category,
    impact_level,
    key_facts,
    pair_impacts,
  };
}

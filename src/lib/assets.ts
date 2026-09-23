// Curated High-Quality Visual Assets for Professional Financial Intelligence UI
// Provides CDN images, country flags, asset emblems, and category illustrations

export interface AssetVisualMeta {
  symbol: string;
  name: string;
  category: 'FOREX' | 'COMMODITY' | 'INDEX' | 'CRYPTO' | 'BOND';
  flagUrls?: string[];
  iconType: 'flag' | 'gold' | 'oil' | 'stock' | 'crypto' | 'bond';
  badgeColor: string;
  thumbnailUrl: string;
}

// Global Category Visual Banners (Unsplash Curated Financial Photography)
export const CATEGORY_HERO_IMAGES = {
  OVERVIEW: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
  FOREX: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
  COMMODITY: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=800&q=80',
  CRYPTO: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80',
  INDEX: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
  CENTRAL_BANK: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?auto=format&fit=crop&w=800&q=80',
  NEWS_WIRE: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80',
  MACRO_DATA: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  INTERMARKET: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=800&q=80',
};

// FlagCDN base URLs for G8 Currencies
const FLAG_CODES: Record<string, string> = {
  USD: 'us',
  EUR: 'eu',
  GBP: 'gb',
  JPY: 'jp',
  AUD: 'au',
  CAD: 'ca',
  CHF: 'ch',
  NZD: 'nz',
  CNY: 'cn',
  IDR: 'id',
  SGD: 'sg',
};

export function getCurrencyFlagUrl(currency: string): string {
  const code = FLAG_CODES[currency.toUpperCase()];
  if (code) {
    return `https://flagcdn.com/w40/${code}.png`;
  }
  return 'https://flagcdn.com/w40/un.png';
}

// Visual Meta Map for All Major Financial Instruments
export const ASSET_VISUAL_MAP: Record<string, AssetVisualMeta> = {
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/eu.png', 'https://flagcdn.com/w40/us.png'],
    iconType: 'flag',
    badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/gb.png', 'https://flagcdn.com/w40/us.png'],
    iconType: 'flag',
    badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  USDJPY: {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/us.png', 'https://flagcdn.com/w40/jp.png'],
    iconType: 'flag',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/au.png', 'https://flagcdn.com/w40/us.png'],
    iconType: 'flag',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  USDCHF: {
    symbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/us.png', 'https://flagcdn.com/w40/ch.png'],
    iconType: 'flag',
    badgeColor: 'text-red-400 bg-red-950/60 border-red-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  USDCAD: {
    symbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/us.png', 'https://flagcdn.com/w40/ca.png'],
    iconType: 'flag',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    name: 'New Zealand Dollar / US Dollar',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/nz.png', 'https://flagcdn.com/w40/us.png'],
    iconType: 'flag',
    badgeColor: 'text-teal-400 bg-teal-950/60 border-teal-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  GBPJPY: {
    symbol: 'GBPJPY',
    name: 'British Pound / Japanese Yen',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/gb.png', 'https://flagcdn.com/w40/jp.png'],
    iconType: 'flag',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  EURGBP: {
    symbol: 'EURGBP',
    name: 'Euro / British Pound',
    category: 'FOREX',
    flagUrls: ['https://flagcdn.com/w40/eu.png', 'https://flagcdn.com/w40/gb.png'],
    iconType: 'flag',
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  DXY: {
    symbol: 'DXY',
    name: 'US Dollar Index',
    category: 'BOND',
    flagUrls: ['https://flagcdn.com/w40/us.png'],
    iconType: 'flag',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
  },
  XAUUSD: {
    symbol: 'XAUUSD',
    name: 'Spot Gold / US Dollar',
    category: 'COMMODITY',
    iconType: 'gold',
    badgeColor: 'text-amber-300 bg-amber-950/60 border-amber-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=400&q=80',
  },
  BRENT: {
    symbol: 'BRENT',
    name: 'Brent Crude Oil',
    category: 'COMMODITY',
    iconType: 'oil',
    badgeColor: 'text-orange-400 bg-orange-950/60 border-orange-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
  },
  US500: {
    symbol: 'US500',
    name: 'S&P 500 Index',
    category: 'INDEX',
    iconType: 'stock',
    badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80',
  },
  US100: {
    symbol: 'US100',
    name: 'Nasdaq 100 Index (Tech & Growth)',
    category: 'INDEX',
    iconType: 'stock',
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80',
  },
  US30: {
    symbol: 'US30',
    name: 'Dow Jones 30 Index (Industrials & Value)',
    category: 'INDEX',
    iconType: 'stock',
    badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80',
  },
  BTCUSD: {
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    category: 'CRYPTO',
    iconType: 'crypto',
    badgeColor: 'text-yellow-400 bg-yellow-950/60 border-yellow-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=400&q=80',
  },
  US10Y: {
    symbol: 'US10Y',
    name: 'US 10-Year Treasury Yield',
    category: 'BOND',
    iconType: 'bond',
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80',
  },
};

// Smart Category Thumbnail Selector for News & Events
export function getCategoryVisual(category: string, title?: string): {
  thumbnailUrl: string;
  label: string;
  gradient: string;
} {
  const cat = (category || '').toUpperCase();
  const t = (title || '').toUpperCase();

  if (cat.includes('CENTRAL') || cat.includes('FED') || t.includes('POWELL') || t.includes('ECB') || t.includes('LAGARDE') || t.includes('RATE')) {
    return {
      thumbnailUrl: CATEGORY_HERO_IMAGES.CENTRAL_BANK,
      label: 'Central Bank',
      gradient: 'from-blue-950/80 to-slate-900',
    };
  }

  if (cat.includes('COMMODITY') || t.includes('GOLD') || t.includes('OIL') || t.includes('OPEC') || t.includes('XAU')) {
    return {
      thumbnailUrl: CATEGORY_HERO_IMAGES.COMMODITY,
      label: 'Commodities',
      gradient: 'from-amber-950/80 to-slate-900',
    };
  }

  if (cat.includes('CRYPTO') || t.includes('BITCOIN') || t.includes('BTC') || t.includes('ETHEREUM') || t.includes('CRYPTO')) {
    return {
      thumbnailUrl: CATEGORY_HERO_IMAGES.CRYPTO,
      label: 'Crypto',
      gradient: 'from-yellow-950/80 to-slate-900',
    };
  }

  if (cat.includes('FOREX') || t.includes('CURRENCY') || t.includes('DOLLAR') || t.includes('YEN') || t.includes('POUND')) {
    return {
      thumbnailUrl: CATEGORY_HERO_IMAGES.FOREX,
      label: 'Forex & Currencies',
      gradient: 'from-cyan-950/80 to-slate-900',
    };
  }

  if (cat.includes('INDEX') || cat.includes('EQUITY') || t.includes('STOCKS') || t.includes('WALL STREET') || t.includes('S&P')) {
    return {
      thumbnailUrl: CATEGORY_HERO_IMAGES.INDEX,
      label: 'Equities & Indices',
      gradient: 'from-emerald-950/80 to-slate-900',
    };
  }

  if (cat.includes('MACRO') || t.includes('CPI') || t.includes('GDP') || t.includes('INFLATION') || t.includes('NFP') || t.includes('JOBS')) {
    return {
      thumbnailUrl: CATEGORY_HERO_IMAGES.MACRO_DATA,
      label: 'Macroeconomic',
      gradient: 'from-purple-950/80 to-slate-900',
    };
  }

  return {
    thumbnailUrl: CATEGORY_HERO_IMAGES.NEWS_WIRE,
    label: 'Market Wire',
    gradient: 'from-slate-900 to-slate-950',
  };
}

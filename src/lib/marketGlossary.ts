export interface GlossaryItem {
  term: string;
  shortLabel: string;
  category: 'TIMING' | 'MACRO' | 'PRICE_ACTION' | 'CURRENCY' | 'INTELLIGENCE' | 'EXECUTION';
  definition: string;
  formulaOrInterpretation?: string;
  whyItMatters: string;
}

export const MARKET_GLOSSARY: Record<string, GlossaryItem> = {
  WIB: {
    term: 'Waktu Indonesia Barat (WIB)',
    shortLabel: 'WIB',
    category: 'TIMING',
    definition: 'Zona Waktu Indonesia Barat (UTC+7 / Jakarta time). Jam acuan baku untuk memantau pembukaan dan penutupan sesi bursa internasional.',
    formulaOrInterpretation: 'WIB = UTC + 7 Jam. Sesi London buka ~14:00/15:00 WIB, New York buka ~19:00/20:00 WIB.',
    whyItMatters: 'Memudahkan trader di Indonesia mengetahui jadwal rilis makro dan overlap likuiditas bursa tanpa perlu konversi manual.'
  },
  UTC: {
    term: 'Coordinated Universal Time (UTC)',
    shortLabel: 'UTC',
    category: 'TIMING',
    definition: 'Standar waktu global universal tanpa daylight saving time yang digunakan oleh institusi keuangan dan feed berita perbankan.',
    formulaOrInterpretation: 'UTC+0. Seluruh stempel data mentah disimpan dalam UTC sebelum dikonversi ke waktu lokal trader.',
    whyItMatters: 'Mencegah perbedaan waktu saat sinkronisasi feed antar bursa (Tokyo, London, New York).'
  },
  CCY: {
    term: 'Currency (Mata Uang)',
    shortLabel: 'CCY',
    category: 'CURRENCY',
    definition: 'Kode standar internasional 3-huruf (ISO 4217) yang merepresentasikan mata uang sovereign (USD, EUR, GBP, JPY, AUD, CAD, CHF, NZD).',
    whyItMatters: 'Menentukan aset atau pasangan mata uang mana yang akan langsung terpengaruh oleh data ekonomi terkait.'
  },
  ACTUAL: {
    term: 'Nilai Aktual (Actual Release)',
    shortLabel: 'ACTUAL',
    category: 'MACRO',
    definition: 'Angka resmi yang diterbitkan langsung oleh badan statistik nasional (misal: US BLS, BEA, Eurostat, ONS).',
    formulaOrInterpretation: 'Dibandingkan langsung dengan Konsensus/Forecast untuk menghitung deviasi kejutan (Surprise).',
    whyItMatters: 'Merupakan katalis utama pergerakan harga instan (re-pricing) di pasar keuangan global.'
  },
  FORECAST: {
    term: 'Konsensus / Forecast',
    shortLabel: 'FORECAST',
    category: 'MACRO',
    definition: 'Estimasi median dari survei puluhan ekonom institusional dan bank investasi sebelum data resmi dirilis.',
    formulaOrInterpretation: 'Harga pasar umumnya telah memperhitungkan (priced in) angka forecast ini.',
    whyItMatters: 'Jika nilai aktual sama persis dengan forecast, reaksi harga seringkali minimal karena sudah diantisipasi pasar.'
  },
  PREVIOUS: {
    term: 'Nilai Sebelumnya (Previous)',
    shortLabel: 'PREVIOUS',
    category: 'MACRO',
    definition: 'Angka hasil rilis pada periode pelaporan sebelumnya (bulan lalu / kuartal lalu), termasuk revisi resmi terbaru.',
    formulaOrInterpretation: 'Digunakan untuk mengukur arah tren makro (akselerasi vs deselerasi ekonomi).',
    whyItMatters: 'Revisi besar pada angka previous sering memicu volatilitas lanjutan meski angka aktual sesuai forecast.'
  },
  SURPRISE: {
    term: 'Macro Surprise (Deviasi Kejutan)',
    shortLabel: 'SURPRISE',
    category: 'MACRO',
    definition: 'Selisih matematis antara angka Aktual dan angka Konsensus/Forecast.',
    formulaOrInterpretation: 'BEAT = Aktual lebih tinggi dari konsensus. MISS = Aktual lebih rendah dari konsensus.',
    whyItMatters: 'Semakin besar deviasi kejutan (Surprise), semakin tajam pergerakan volatilitas dan order flow institusi.'
  },
  BEAT: {
    term: 'Data Beat (Melampaui Ekspektasi)',
    shortLabel: 'BEAT',
    category: 'MACRO',
    definition: 'Hasil data ekonomi aktual keluar lebih kuat/tinggi daripada proyeksi konsensus analis.',
    whyItMatters: 'Biasanya memicu penguatan mata uang negara terkait (misal: NFP Beat -> USD menguat).'
  },
  MISS: {
    term: 'Data Miss (Meleset di Bawah Ekspektasi)',
    shortLabel: 'MISS',
    category: 'MACRO',
    definition: 'Hasil data ekonomi aktual keluar lebih lemah/rendah daripada proyeksi konsensus analis.',
    whyItMatters: 'Biasanya memicu pelemahan mata uang terkait atau memicu ekspektasi pemangkasan suku bunga acuan.'
  },
  IMPACT: {
    term: 'Tingkat Dampak Makro (Impact Tier)',
    shortLabel: 'IMPACT',
    category: 'MACRO',
    definition: 'Klasifikasi potensi volatilitas yang dapat ditimbulkan rilis berita pada instrumen terkait.',
    formulaOrInterpretation: 'CRITICAL (merah): CPI, NFP, Suku Bunga. HIGH (kuning): Retail Sales, GDP, PMI. MEDIUM (biru): Trade Balance.',
    whyItMatters: 'Membantu trader mengelola risiko posisi dan menghindari pelebaran spread tiba-tiba.'
  },
  OVERALL_BIAS: {
    term: 'Intraday Market Bias (Arah Kecenderungan)',
    shortLabel: 'BIAS',
    category: 'INTELLIGENCE',
    definition: 'Sintesis arah tren intraday institusional: BULLISH (naik), BEARISH (turun), NEUTRAL (sideways), atau MIXED (tarik-menarik).',
    formulaOrInterpretation: 'Dihitung dari kombinasi order flow, diferensial suku bunga, dan tren teknikal multi-timeframe.',
    whyItMatters: 'Mengarahkan trader untuk trading searah dengan momentum dominan institusi (trend following).'
  },
  CONFIDENCE: {
    term: 'Confidence Score (Tingkat Keyakinan Algoritmik)',
    shortLabel: 'CONF',
    category: 'INTELLIGENCE',
    definition: 'Persentase tingkat keyakinan sistem (0 - 100%) terhadap arah bias yang dianalisis.',
    formulaOrInterpretation: 'Semakin banyak variabel makro dan likuiditas yang searah, semakin tinggi skor confidence (>80% = Tinggi).',
    whyItMatters: 'Membantu trader memfilter sinyal berprobabilitas tinggi vs sinyal spekulatif.'
  },
  CHANGE_24H: {
    term: '24H Percentage Change',
    shortLabel: '24H CHG',
    category: 'PRICE_ACTION',
    definition: 'Persentase perubahan harga saat ini dibandingkan dengan level penutupan 24 jam sebelumnya.',
    formulaOrInterpretation: '((Harga Sekarang - Harga 24 Jam Lalu) / Harga 24 Jam Lalu) * 100%',
    whyItMatters: 'Mengidentifikasi aset mana yang sedang mengalami aliran dana masuk (inflow) atau keluar (outflow) terkuat.'
  },
  RANGE_24H: {
    term: '24H Price Range (High / Low)',
    shortLabel: '24H RANGE',
    category: 'PRICE_ACTION',
    definition: 'Rentang harga tertinggi (High) dan terendah (Low) yang tercapai dalam kurun waktu 24 jam terakhir.',
    whyItMatters: 'Menunjukkan batas volatilitas harian dan posisi harga saat ini terhadap batas ekstrem harian.'
  },
  SPREAD: {
    term: 'Bid-Ask Spread (Spread Likuiditas)',
    shortLabel: 'SPREAD',
    category: 'EXECUTION',
    definition: 'Selisih harga antara penawaran beli tertinggi (Bid) dan harga jual terendah (Ask) dari penyedia likuiditas.',
    whyItMatters: 'Biaya transaksi langsung. Saat berita makro rilis, spread dapat melebar drastis.'
  },
  ATR: {
    term: 'Average True Range (ATR)',
    shortLabel: 'ATR',
    category: 'PRICE_ACTION',
    definition: 'Indikator teknikal yang mengukur rentang rata-rata pergerakan harga harian dalam periode tertentu (biasanya 14 hari).',
    formulaOrInterpretation: 'ATR tinggi = pasar sedang sangat volatil; ATR rendah = fase konsolidasi/kompresi.',
    whyItMatters: 'Digunakan institusi untuk menentukan jarak Stop Loss yang rasional agar tidak ter-sweep noise pasar.'
  },
  ADR: {
    term: 'Average Daily Range (ADR Usage)',
    shortLabel: 'ADR',
    category: 'PRICE_ACTION',
    definition: 'Persentase kapasitas pergerakan harian rata-rata yang telah dihabiskan oleh harga pada sesi hari ini.',
    formulaOrInterpretation: 'Jika ADR Usage > 90%, aset mendekati titik jenuh dan potensi retracement meningkat.',
    whyItMatters: 'Mencegah trader mengejar harga yang sudah mengalami overextension (terlalu jauh dari mean).'
  },
  REACTION_HORIZONS: {
    term: 'Reaction Horizons (R1M, R5M, R15M, R1H, R4H)',
    shortLabel: 'REACTION',
    category: 'MACRO',
    definition: 'Persentase pergerakan harga riil pada aset acuan utama yang tercatat setelah rilis berita pada jendela waktu 1 menit, 5 menit, 15 menit, 1 jam, dan 4 jam.',
    whyItMatters: 'Membuktikan apakah rilis berita memicu pergerakan tren berkelanjutan atau hanya lonjakan spike sesaat.'
  },
  PRIMARY_ASSET: {
    term: 'Primary Benchmark Asset (Aset Acuan)',
    shortLabel: 'BENCHMARK',
    category: 'MACRO',
    definition: 'Instrumen paling likuid yang dipantau sistem untuk mengukur transmisi dampak berita (contoh: DXY untuk USD, US10Y untuk Yield, EURUSD untuk Eurozone).',
    whyItMatters: 'Menjadi acuan standar untuk mengukur korelasi lintas pasar (intermarket analysis).'
  },
  FUNDAMENTAL_IMPLICATION: {
    term: 'Fundamental Implication (Implikasi Makro)',
    shortLabel: 'FUNDAMENTAL',
    category: 'INTELLIGENCE',
    definition: 'Analisis tesis teoritis jangka menengah mengenai arah kebijakan suku bunga bank sentral (Hawkish vs Dovish) akibat data ekonomi terbaru.',
    whyItMatters: 'Membantu trader memahami arah tren besar (macro regime) di luar pergerakan scalping jangka pendek.'
  },
  ACTUAL_MARKET_REACTION: {
    term: 'Actual Market Reaction (Reaksi Riil Likuiditas)',
    shortLabel: 'REAKSI PASAR',
    category: 'INTELLIGENCE',
    definition: 'Catatan empiris pergerakan harga, volatilitas spread, dan absorpsi likuiditas yang diamati langsung di pasar saat peristiwa terjadi.',
    whyItMatters: 'Memverifikasi apakah pergerakan pasar nyata sejalan dengan teori fundamental atau terjadi deviasi aliran dana (flow mismatch).'
  },
  CURRENCY_STRENGTH: {
    term: 'Currency Strength Score (Skor Kekuatan Mata Uang)',
    shortLabel: 'STRENGTH',
    category: 'CURRENCY',
    definition: 'Skor kekuatan relatif (skala 0.0 - 10.0) yang mengukur performa suatu mata uang terhadap 7 mata uang utama lainnya.',
    formulaOrInterpretation: 'Skor > 7.0 = Kuat (Strong); 4.5 - 5.5 = Netral; < 3.0 = Lemah (Weak).',
    whyItMatters: 'Membantu memasangkan mata uang terkuat dengan mata uang terlemah untuk peluang trading tren dengan probabilitas tertinggi.'
  },
  DIVERGENCE_DELTA: {
    term: 'Divergence Delta (Diferensial Kekuatan)',
    shortLabel: 'DELTA',
    category: 'CURRENCY',
    definition: 'Selisih matematis antara skor kekuatan Base Currency dan Quote Currency pada suatu pasangan mata uang.',
    formulaOrInterpretation: 'Delta = Skor Base - Skor Quote. Delta >= +4.0 (Strong Buy); Delta <= -4.0 (Strong Sell); Delta dekat 0 (Chop/Sideways).',
    whyItMatters: 'Pasangan dengan delta tinggi memiliki momentum tren paling bersih, sedangkan delta rendah rawan false breakout.'
  },
  PRIME_PAIR: {
    term: 'Prime Trade Opportunity',
    shortLabel: 'PRIME',
    category: 'EXECUTION',
    definition: 'Klasifikasi pasangan mata uang dengan disparitas kekuatan fundamental tinggi (> 4.0 delta) yang ideal untuk strategi trend-following.',
    whyItMatters: 'Menghemat waktu analisa trader dengan langsung menyaring pasangan paling menguntungkan.'
  },
  CHOP_AVOID: {
    term: 'Chop / Whipsaw Avoid Tier',
    shortLabel: 'CHOP',
    category: 'EXECUTION',
    definition: 'Kondisi di mana kedua mata uang memiliki kekuatan yang seimbang sehingga harga bergerak bolak-balik tanpa tren jelas.',
    whyItMatters: 'Memperingatkan trader agar tidak menggunakan strategi breakout atau menahan posisi ayunan (swing) pada instrumen ini.'
  },
  SSE_STATUS: {
    term: 'Server-Sent Events (SSE) Live Feed Status',
    shortLabel: 'SSE',
    category: 'EXECUTION',
    definition: 'Indikator status koneksi streaming real-time antara antarmuka pengguna (UI) dan server backend.',
    formulaOrInterpretation: 'LIVE (hijau) = Streaming aktif; RECONNECTING (kuning) = Sedang memulihkan sambungan; OFFLINE (merah) = Gagal terhubung.',
    whyItMatters: 'Memastikan data harga, spread, dan kalender yang dilihat trader adalah data mutakhir tanpa jeda.'
  },
  FRESHNESS: {
    term: 'Data Freshness & Provenance (Kesegaran Data)',
    shortLabel: 'FRESHNESS',
    category: 'INTELLIGENCE',
    definition: 'Validasi usia data dan sumber institusional resmi (TradingView, FairEconomy, Central Banks) untuk menjamin keaslian metrik.',
    whyItMatters: 'Menjamin trader tidak mengambil keputusan finansial berdasarkan data kadaluarsa atau estimasi palsu.'
  }
};

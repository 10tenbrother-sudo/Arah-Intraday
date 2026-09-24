import fs from 'fs';
import path from 'path';
import { ArahMarketEngine } from '../intelligence/arahMarketEngine.js';
import { IntradayPairConfluence } from '../types.js';

export interface MarketAlertConfig {
  telegramBotToken: string;
  telegramChatId: string;
  whatsappPhone?: string;
  whatsappApiKey?: string;
  enabled: boolean;
  minConfirmations: number; // default 2
  instruments: string[];
  cooldownMinutes: number; // default 120
  lastAlertsSent: Record<string, { action: string; sentAt: string; price: number; bias: string }>;
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'market_alerts_config.json');

const DEFAULT_INSTRUMENTS = [
  'XAUUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'US100',
  'US30',
  'US500',
  'BTC',
];

export class MarketAlertService {
  private static config: MarketAlertConfig = MarketAlertService.loadConfig();

  private static loadConfig(): MarketAlertConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          telegramBotToken: parsed.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
          telegramChatId: parsed.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
          whatsappPhone: parsed.whatsappPhone || process.env.WHATSAPP_PHONE || '',
          whatsappApiKey: parsed.whatsappApiKey || process.env.WHATSAPP_API_KEY || '',
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : (process.env.TELEGRAM_ALERTS_ENABLED === 'true'),
          minConfirmations: parsed.minConfirmations || 2,
          instruments: Array.isArray(parsed.instruments) && parsed.instruments.length > 0 ? parsed.instruments : DEFAULT_INSTRUMENTS,
          cooldownMinutes: parsed.cooldownMinutes || 120,
          lastAlertsSent: parsed.lastAlertsSent || {},
        };
      }
    } catch (err: any) {
      console.warn('[MarketAlertService] Notice loading config file:', err.message);
    }

    return {
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
      whatsappPhone: process.env.WHATSAPP_PHONE || '',
      whatsappApiKey: process.env.WHATSAPP_API_KEY || '',
      enabled: process.env.TELEGRAM_ALERTS_ENABLED === 'true',
      minConfirmations: 2,
      instruments: DEFAULT_INSTRUMENTS,
      cooldownMinutes: 120,
      lastAlertsSent: {},
    };
  }

  private static saveConfig(): void {
    try {
      const dir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[MarketAlertService] Failed to persist config:', err.message);
    }
  }

  public static getConfig(): MarketAlertConfig {
    return { ...this.config };
  }

  public static getPublicConfig(): Omit<MarketAlertConfig, 'telegramBotToken' | 'whatsappApiKey'> & {
    telegramBotTokenMasked: string;
    hasTelegramToken: boolean;
    hasWhatsappKey: boolean;
  } {
    const rawToken = this.config.telegramBotToken || '';
    const masked = rawToken.length > 8
      ? `${rawToken.slice(0, 4)}...${rawToken.slice(-4)}`
      : rawToken.length > 0 ? '••••••••' : '';

    return {
      telegramChatId: this.config.telegramChatId,
      whatsappPhone: this.config.whatsappPhone || '',
      enabled: this.config.enabled,
      minConfirmations: this.config.minConfirmations,
      instruments: this.config.instruments,
      cooldownMinutes: this.config.cooldownMinutes,
      lastAlertsSent: this.config.lastAlertsSent,
      telegramBotTokenMasked: masked,
      hasTelegramToken: rawToken.trim().length > 0,
      hasWhatsappKey: (this.config.whatsappApiKey || '').trim().length > 0,
    };
  }

  public static updateConfig(updates: Partial<MarketAlertConfig>): MarketAlertConfig {
    // If bot token is passed as masked or unchanged empty string, do not overwrite existing
    if (updates.telegramBotToken !== undefined) {
      const trimmed = updates.telegramBotToken.trim();
      if (trimmed && !trimmed.includes('...')) {
        this.config.telegramBotToken = trimmed;
      }
    }

    if (updates.telegramChatId !== undefined) {
      this.config.telegramChatId = updates.telegramChatId.trim();
    }

    if (updates.whatsappPhone !== undefined) {
      this.config.whatsappPhone = updates.whatsappPhone.trim();
    }

    if (updates.whatsappApiKey !== undefined) {
      const trimmed = updates.whatsappApiKey.trim();
      if (trimmed && !trimmed.includes('...')) {
        this.config.whatsappApiKey = trimmed;
      }
    }

    if (typeof updates.enabled === 'boolean') {
      this.config.enabled = updates.enabled;
    }

    if (typeof updates.minConfirmations === 'number' && updates.minConfirmations >= 1) {
      this.config.minConfirmations = updates.minConfirmations;
    }

    if (Array.isArray(updates.instruments)) {
      this.config.instruments = updates.instruments;
    }

    if (typeof updates.cooldownMinutes === 'number' && updates.cooldownMinutes >= 5) {
      this.config.cooldownMinutes = updates.cooldownMinutes;
    }

    this.saveConfig();
    return { ...this.config };
  }

  /**
   * Dispatches a Telegram message via HTTP to Telegram Bot API.
   */
  public static async sendTelegramMessage(
    text: string,
    overrideToken?: string,
    overrideChatId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = overrideToken || this.config.telegramBotToken;
    const chatId = overrideChatId || this.config.telegramChatId;

    if (!token || !chatId) {
      return { success: false, error: 'Telegram Bot Token or Chat ID is not configured.' };
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        const errorDesc = data.description || `HTTP ${response.status} ${response.statusText}`;
        console.warn('[MarketAlertService] Telegram API rejection:', errorDesc);
        return { success: false, error: errorDesc };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[MarketAlertService] Telegram network failure:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispatches a WhatsApp message via CallMeBot API if configured.
   */
  public static async sendWhatsappMessage(
    text: string,
    overridePhone?: string,
    overrideApiKey?: string
  ): Promise<{ success: boolean; error?: string }> {
    const phone = overridePhone || this.config.whatsappPhone;
    const apiKey = overrideApiKey || this.config.whatsappApiKey;

    if (!phone || !apiKey) {
      return { success: false, error: 'WhatsApp phone or CallMeBot API key is not configured.' };
    }

    try {
      // CallMeBot standard GET format
      const encodedText = encodeURIComponent(text.replace(/<[^>]*>/g, '')); // strip HTML for WA text
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodedText}&apikey=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      const body = await response.text();

      if (!response.ok || body.toLowerCase().includes('error')) {
        return { success: false, error: body || `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends a test alert to verify Telegram connection.
   */
  public static async sendTelegramTest(
    testToken?: string,
    testChatId?: string
  ): Promise<{ success: boolean; message: string }> {
    const token = testToken || this.config.telegramBotToken;
    const chatId = testChatId || this.config.telegramChatId;

    if (!token || !chatId) {
      return { success: false, message: 'Please provide both Telegram Bot Token and Chat ID.' };
    }

    const testMessage = [
      '🔔 <b>ARAH MARKET — TELEGRAM BOT TEST</b>',
      '',
      '✅ <b>Connection Status:</b> Successfully Connected!',
      '📡 <b>Engine:</b> Macro & FX Confluence System',
      `🕒 <b>Timestamp:</b> ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      '',
      '<i>Market Bias alerts with 2+ confirmations (LOOK FOR BUY / LOOK FOR SELL) will be delivered to this channel in real time.</i>',
    ].join('\n');

    const result = await this.sendTelegramMessage(testMessage, token, chatId);
    if (result.success) {
      return { success: true, message: 'Test message sent successfully to Telegram!' };
    } else {
      return { success: false, message: `Failed to send Telegram message: ${result.error}` };
    }
  }

  /**
   * Formats a high-clarity alert message for a pair that reached 2+ confirmations.
   */
  private static formatPairAlertMessage(pair: IntradayPairConfluence): string {
    const isBuy = pair.intradayPlan.recommendedAction === 'LOOK_FOR_BUY';
    const actionBadge = isBuy ? '🟢 <b>LOOK FOR BUY</b>' : '🔴 <b>LOOK FOR SELL</b>';
    const priceChange = pair.change24hPct >= 0 ? `+${pair.change24hPct.toFixed(2)}%` : `${pair.change24hPct.toFixed(2)}%`;
    const timeStr = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

    const lines = [
      '🚨 <b>ARAH MARKET INTELLIGENCE ALERT</b>',
      '',
      `📊 <b>Instrument:</b> <b>${pair.pair}</b> (${pair.displayName})`,
      `⚡ <b>Action:</b> ${actionBadge} (${pair.confluenceStatus === 'HIGH_CONVICTION' ? '3/3 Aligned' : '2/3 Confluence'})`,
      `💰 <b>Price:</b> <code>${pair.currentPrice}</code> (${priceChange})`,
      `🎯 <b>Conviction Score:</b> ${pair.convictionScore}%`,
      '',
      '📌 <b>CONFLUENCE PILLARS:</b>',
    ];

    // Pillar 1: CS Pillar (if forex) or Fundamental
    if (pair.currencyStrength) {
      const cs = pair.currencyStrength;
      const csDiff = cs.netDifferential >= 0 ? `+${cs.netDifferential.toFixed(1)}` : cs.netDifferential.toFixed(1);
      lines.push(
        `• <b>CS Flow:</b> <b>${cs.bias}</b> [${cs.alignment}] (${cs.baseCurrency} ${cs.baseScore.toFixed(1)} vs ${cs.quoteCurrency} ${cs.quoteScore.toFixed(1)} | Δ ${csDiff})`
      );
    } else {
      lines.push(`• <b>Fundamental:</b> <b>${pair.fundamental.bias}</b> (${pair.fundamental.keyDriver})`);
    }

    // Pillar 2: Intermarket
    lines.push(`• <b>Intermarket:</b> <b>${pair.intermarket.bias}</b> (${pair.intermarket.primarySymptom})`);

    // Pillar 3: Price Action
    lines.push(`• <b>Price Action:</b> <b>${pair.priceAction.bias}</b> (${pair.priceAction.actionableZone})`);

    // Invalidation
    lines.push('');
    lines.push(`🛑 <b>Invalidation Level:</b> ${pair.intradayPlan.invalidationTrigger}`);

    if (pair.intradayPlan.warningNote) {
      lines.push(`⚠️ <b>Note:</b> ${pair.intradayPlan.warningNote}`);
    }

    lines.push('');
    lines.push(`🕒 <b>Alert Time:</b> ${timeStr} WIB | Arah Market Terminal`);

    return lines.join('\n');
  }

  /**
   * Scans current market bias across configured pairs and dispatches alerts for eligible confirmations.
   */
  public static async checkAndDispatchAlerts(): Promise<{
    dispatchedCount: number;
    dispatched: Array<{ pair: string; action: string; price: number }>;
  }> {
    if (!this.config.enabled) {
      return { dispatchedCount: 0, dispatched: [] };
    }

    const hasTelegram = Boolean(this.config.telegramBotToken && this.config.telegramChatId);
    const hasWhatsapp = Boolean(this.config.whatsappPhone && this.config.whatsappApiKey);

    if (!hasTelegram && !hasWhatsapp) {
      return { dispatchedCount: 0, dispatched: [] };
    }

    try {
      const marketToday = await ArahMarketEngine.getArahMarketToday();
      const dispatched: Array<{ pair: string; action: string; price: number }> = [];
      const now = Date.now();
      const cooldownMs = (this.config.cooldownMinutes || 120) * 60 * 1000;

      for (const pair of marketToday.pairs) {
        // Filter by user's chosen instruments
        if (this.config.instruments.length > 0 && !this.config.instruments.includes(pair.pair)) {
          continue;
        }

        const action = pair.intradayPlan.recommendedAction;
        // Only trigger on 2+ confirmations: LOOK_FOR_BUY or LOOK_FOR_SELL
        if (action !== 'LOOK_FOR_BUY' && action !== 'LOOK_FOR_SELL') {
          continue;
        }

        // Check deduplication & cooldown
        const lastSent = this.config.lastAlertsSent[pair.pair];
        if (lastSent) {
          const sentTime = new Date(lastSent.sentAt).getTime();
          const elapsed = now - sentTime;

          // If same action and within cooldown window, skip to avoid spam
          if (lastSent.action === action && elapsed < cooldownMs) {
            continue;
          }
        }

        // Format message
        const message = this.formatPairAlertMessage(pair);

        // Send via Telegram
        let sentOk = false;
        if (hasTelegram) {
          const tgRes = await this.sendTelegramMessage(message);
          if (tgRes.success) sentOk = true;
        }

        // Send via WhatsApp if configured
        if (hasWhatsapp) {
          const waRes = await this.sendWhatsappMessage(message);
          if (waRes.success) sentOk = true;
        }

        if (sentOk) {
          // Record sent alert
          this.config.lastAlertsSent[pair.pair] = {
            action,
            sentAt: new Date().toISOString(),
            price: pair.currentPrice,
            bias: pair.directionalBias,
          };
          dispatched.push({ pair: pair.pair, action, price: pair.currentPrice });
        }
      }

      if (dispatched.length > 0) {
        this.saveConfig();
        console.log(`[MarketAlertService] Dispatched ${dispatched.length} market bias alerts to subscribers:`, dispatched.map(d => `${d.pair}:${d.action}`).join(', '));
      }

      return { dispatchedCount: dispatched.length, dispatched };
    } catch (err: any) {
      console.error('[MarketAlertService] Error during alert check & dispatch:', err.message);
      return { dispatchedCount: 0, dispatched: [] };
    }
  }
}

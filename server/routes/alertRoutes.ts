import { Router } from 'express';
import { MarketAlertService } from '../services/marketAlertService.js';

export const alertRouter = Router();

// GET /api/alerts/config - Retrieve current alert settings (bot token masked for security)
alertRouter.get('/config', (req, res) => {
  try {
    const config = MarketAlertService.getPublicConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts/config - Update alert settings
alertRouter.post('/config', (req, res) => {
  try {
    const {
      telegramBotToken,
      telegramChatId,
      whatsappPhone,
      whatsappApiKey,
      enabled,
      minConfirmations,
      instruments,
      cooldownMinutes,
    } = req.body;

    const updated = MarketAlertService.updateConfig({
      telegramBotToken,
      telegramChatId,
      whatsappPhone,
      whatsappApiKey,
      enabled,
      minConfirmations,
      instruments,
      cooldownMinutes,
    });

    res.json({
      success: true,
      config: MarketAlertService.getPublicConfig(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts/test-telegram - Send test alert to Telegram
alertRouter.post('/test-telegram', async (req, res) => {
  try {
    const { token, chatId } = req.body || {};
    const result = await MarketAlertService.sendTelegramTest(token, chatId);
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/alerts/test-whatsapp - Send test alert to WhatsApp
alertRouter.post('/test-whatsapp', async (req, res) => {
  try {
    const { phone, apiKey } = req.body || {};
    const testText = '🔔 *Arah Market Alert Test*: WhatsApp notification connected successfully!';
    const result = await MarketAlertService.sendWhatsappMessage(testText, phone, apiKey);
    if (result.success) {
      res.json({ success: true, message: 'Test message sent successfully to WhatsApp!' });
    } else {
      res.status(400).json({ success: false, message: result.error || 'Failed to send WhatsApp message' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/alerts/scan - Immediately scan Market Bias and dispatch any pending alerts
alertRouter.post('/scan', async (req, res) => {
  try {
    const result = await MarketAlertService.checkAndDispatchAlerts();
    res.json({
      success: true,
      dispatched_count: result.dispatchedCount,
      alerts: result.dispatched,
      message: result.dispatchedCount > 0
        ? `Dispatched ${result.dispatchedCount} alerts.`
        : 'Scan completed. No new alerts meeting the 2+ confirmation criteria at this time.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

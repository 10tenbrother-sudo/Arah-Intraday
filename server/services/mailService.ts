/**
 * Mailer Service using NodeMailer
 * Sends transactional emails including Account Email Verification links.
 * Automatically switches between live SMTP (e.g. Gmail / Brevo / SendGrid)
 * and secure dev mode logging when SMTP credentials are not yet specified.
 */

import nodemailer, { Transporter } from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  verificationUrl: string;
  devMode: boolean;
  error?: string;
}

export interface SentEmailLog {
  to: string;
  name: string;
  subject: string;
  verificationUrl: string;
  token: string;
  sentAt: string;
}

export class MailService {
  private transporter: Transporter | null = null;
  private isConfiguredState = false;
  private lastSentEmail: SentEmailLog | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const rawUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
    const rawPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
    
    // Google App Passwords are 16 characters typically formatted with spaces: "xxxx xxxx xxxx xxxx"
    // NodeMailer / Gmail SMTP requires removing all spaces, otherwise returns 535-5.7.8 Invalid login!
    const cleanPass = rawPass.replace(/\s+/g, '');
    const cleanUser = rawUser.trim();

    // Check if cleanUser is a valid email format
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanUser);

    const host = process.env.SMTP_HOST || (cleanUser.includes('@gmail.com') ? 'smtp.gmail.com' : 'smtp.gmail.com');
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (cleanUser && cleanPass && isEmail) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user: cleanUser,
            pass: cleanPass,
          },
        });
        this.isConfiguredState = true;
        console.log(`[MailService] Transporter configured for SMTP server (${host}:${port}) with user ${cleanUser}`);
      } catch (err) {
        console.error('[MailService] Failed to initialize SMTP transporter:', err);
        this.transporter = null;
        this.isConfiguredState = false;
      }
    } else {
      this.transporter = null;
      this.isConfiguredState = false;
      if (cleanUser && !isEmail) {
        console.warn(
          `[MailService] Notice: SMTP_USER ("${cleanUser.length > 8 ? cleanUser.substring(0, 4) + '...' : cleanUser}") is not a valid email address. ` +
          'For Gmail SMTP, SMTP_USER must be your full Gmail address (e.g. user@gmail.com) and SMTP_PASS must be your 16-character Google App Password. ' +
          'Running in development simulation / instant activation mode.'
        );
      } else {
        console.log(
          '[MailService] SMTP credentials not fully configured. Running in development simulation / instant activation mode.'
        );
      }
    }
  }

  public isConfigured(): boolean {
    return this.isConfiguredState && this.transporter !== null;
  }

  /**
   * Whether verification/reset links may be echoed back in an API response.
   *
   * Off by default and always off in production: a caller who supplies an email
   * address must never receive that account's token. For local development
   * without SMTP, set AUTH_DEV_LINK_ECHO=true to surface links so the flow can
   * be exercised end to end.
   */
  public static linksVisibleToCaller(): boolean {
    if (process.env.NODE_ENV === 'production') return false;
    return process.env.AUTH_DEV_LINK_ECHO === 'true';
  }

  public reinitTransporter(): void {
    this.initTransporter();
  }

  public getFromAddress(defaultDisplayName = 'ArahMarket Terminal'): string {
    const rawFrom = (process.env.MAIL_FROM || '').trim().replace(/^["']|["']$/g, '');
    const rawUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim().replace(/^["']|["']$/g, '');

    if (rawFrom) {
      if (rawFrom.includes('@')) {
        return rawFrom;
      }
      // If user provided a display name without an @ (e.g. "ArahMarketIntraday"), format properly
      if (rawUser) {
        return `"${rawFrom}" <${rawUser}>`;
      }
      return `"${rawFrom}" <noreply@arahmarket.com>`;
    }

    if (rawUser) {
      return `"${defaultDisplayName}" <${rawUser}>`;
    }
    return `"${defaultDisplayName}" <noreply@arahmarket.com>`;
  }

  public getSmtpConfigSummary() {
    const rawUser = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
    const rawPass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim().replace(/^["']|["']$/g, '');
    const cleanUser = rawUser.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanUser);
    const host = process.env.SMTP_HOST || (cleanUser.includes('@gmail.com') ? 'smtp.gmail.com' : 'smtp.gmail.com');
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    // Mask user email for safe display (e.g., dan***@gmail.com)
    let maskedUser = '';
    if (cleanUser) {
      const parts = cleanUser.split('@');
      if (parts.length === 2) {
        const namePart = parts[0];
        const maskedName = namePart.length > 3 ? `${namePart.substring(0, 3)}***` : `${namePart}***`;
        maskedUser = `${maskedName}@${parts[1]}`;
      } else {
        maskedUser = cleanUser.substring(0, 3) + '***';
      }
    }

    return {
      configured: this.isConfigured(),
      host,
      port,
      secure,
      hasUser: Boolean(cleanUser),
      hasPass: Boolean(rawPass),
      passLength: rawPass.replace(/\s+/g, '').length,
      userMasked: maskedUser,
      isEmailValid: isEmail,
      mode: this.isConfigured() ? ('LIVE_SMTP' as const) : ('DEVELOPMENT_SIMULATION' as const),
    };
  }

  /**
   * Verifies the SMTP connection and credentials with the remote mail server.
   * Can optionally dispatch a real test email to verify end-to-end delivery.
   */
  public async verifySmtpConnection(testRecipientEmail?: string): Promise<{
    success: boolean;
    connected: boolean;
    testEmailSent: boolean;
    message: string;
    details?: string;
    latencyMs?: number;
    config: ReturnType<MailService['getSmtpConfigSummary']>;
  }> {
    // Re-read env vars in case they were updated
    this.initTransporter();
    const config = this.getSmtpConfigSummary();

    if (!config.hasUser || !config.hasPass) {
      return {
        success: false,
        connected: false,
        testEmailSent: false,
        message: 'SMTP credentials are incomplete. The SMTP_USER and/or SMTP_PASS variables are not set in the environment.',
        details: 'Make sure SMTP_USER (sender email) and SMTP_PASS (16-character Google App Password) are set in the configuration.',
        config,
      };
    }

    if (!config.isEmailValid) {
      return {
        success: false,
        connected: false,
        testEmailSent: false,
        message: `Format SMTP_USER ("${config.userMasked}") bukan alamat email yang valid.`,
        details: 'Use a full email address, e.g. trader@example.com',
        config,
      };
    }

    if (!this.transporter) {
      return {
        success: false,
        connected: false,
        testEmailSent: false,
        message: 'Could not initialise the SMTP transporter.',
        details: 'Check the SMTP host and port settings.',
        config,
      };
    }

    const startTime = Date.now();
    try {
      // 1. Perform SMTP handshake & auth verification
      await this.transporter.verify();
      const latencyMs = Date.now() - startTime;

      let testEmailSent = false;
      let emailMessage = '';

      // 2. Optionally send an actual test email
      if (testRecipientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipientEmail.trim())) {
        const cleanRecipient = testRecipientEmail.trim();
        const fromAddress = this.getFromAddress('ArahMarket System');

        await this.transporter.sendMail({
          from: fromAddress,
          to: cleanRecipient,
          subject: '✅ SMTP connection test succeeded • ArahMarket Terminal',
          text: `Hello Admin,\n\nThis is a test email from the ArahMarket Terminal.\nThe SMTP connection to ${config.host}:${config.port} was verified on ${new Date().toLocaleString('en-GB')}.\nHandshake latency: ${latencyMs} ms.\n\nRegards,\nArahMarket System Engine`,
          html: `
            <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #1e293b;border-radius:12px;background:#020617;color:#f8fafc;">
              <div style="display:inline-block;padding:4px 10px;background:#0891b2;color:#020617;font-weight:800;font-size:11px;border-radius:6px;font-family:monospace;">ARAHMARKET SMTP VERIFIER</div>
              <h2 style="color:#38bdf8;margin:16px 0 8px;font-size:20px;">SMTP connection verified!</h2>
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;">Your SMTP credentials are valid and the mail server is ready to send new-account verification links and password recovery emails.</p>
              <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;margin:16px 0;font-family:monospace;font-size:12px;color:#38bdf8;line-height:1.7;">
                <div>• Host: <strong>${config.host}:${config.port}</strong></div>
                <div>• Sender: <strong>${config.userMasked}</strong></div>
                <div>• Handshake latency: <strong>${latencyMs} ms</strong></div>
                <div>• Test time: <strong>${new Date().toLocaleString('en-GB')}</strong></div>
              </div>
              <p style="color:#64748b;font-size:11px;margin:0;">ArahMarket Institutional Intelligence Platform</p>
            </div>
          `,
        });
        testEmailSent = true;
        emailMessage = ` dan email tes berhasil dikirim ke ${cleanRecipient}`;
      }

      return {
        success: true,
        connected: true,
        testEmailSent,
        latencyMs,
        message: `Koneksi SMTP ke ${config.host}:${config.port} BERHASIL (Latensi: ${latencyMs}ms)${emailMessage}!`,
        config,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      let hint = '';
      const errMsg = err?.message || String(err);

      if (
        errMsg.includes('535') ||
        errMsg.includes('BadCredentials') ||
        errMsg.includes('Username and Password not accepted')
      ) {
        hint =
          'Username or password rejected (Error 535). With Gmail, use a 16-character Google App Password (not the normal Google account password) and make sure 2-Step Verification is enabled on the Google account.';
      } else if (errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
        hint = `Could not connect to host ${config.host}:${config.port}. Check whether the port is blocked by a firewall or the host address is wrong.`;
      } else if (errMsg.includes('ENOTFOUND')) {
        hint = `Host address ${config.host} was not found (DNS lookup failed).`;
      }

      return {
        success: false,
        connected: false,
        testEmailSent: false,
        latencyMs,
        message: `Uji koneksi SMTP GAGAL: ${errMsg}`,
        details: hint || errMsg,
        config,
      };
    }
  }

  public getLastSentEmail(): SentEmailLog | null {
    return this.lastSentEmail;
  }

  /**
   * Generates the verification link and sends the verification email.
   */
  public async sendVerificationEmail(
    toEmail: string,
    name: string,
    token: string,
    baseUrl: string,
    code?: string
  ): Promise<EmailSendResult> {
    // Standardize base URL
    const cleanBaseUrl = baseUrl.split(',')[0].trim().replace(/\/+$/, '');
    const verificationUrl = `${cleanBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const webVerificationUrl = `${cleanBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const displayCode = code || token.slice(0, 6).toUpperCase();

    // Save in in-memory debug log
    this.lastSentEmail = {
      to: toEmail,
      name,
      subject: 'ArahMarket account activation • Verify your email',
      verificationUrl,
      token,
      sentAt: new Date().toISOString(),
    };

    const fromAddress = this.getFromAddress('ArahMarket Terminal');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ArahMarket Email Verification</title>
  <style>
    body { margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { max-width: 560px; margin: 40px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .header { padding: 32px 32px 24px; border-bottom: 1px solid #1e293b; text-align: center; background: linear-gradient(180deg, #0f172a 0%, #080e1e 100%); }
    .logo-badge { display: inline-block; background-color: #0891b2; color: #020617; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 6px; letter-spacing: 1px; font-family: monospace; }
    .title { font-size: 20px; font-weight: 700; margin: 16px 0 6px; color: #f1f5f9; font-family: monospace; }
    .subtitle { font-size: 13px; color: #94a3b8; margin: 0; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .user-greeting { font-size: 16px; font-weight: 600; color: #f8fafc; margin-bottom: 12px; }
    .btn-container { text-align: center; margin: 28px 0 20px; }
    .btn { display: inline-block; background-color: #06b6d4; color: #020617 !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; letter-spacing: 0.5px; box-shadow: 0 4px 14px 0 rgba(6, 182, 212, 0.39); }
    .code-box { background-color: #030712; border: 2px dashed #06b6d4; border-radius: 12px; padding: 20px 24px; text-align: center; margin: 24px 0; }
    .code-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #94a3b8; text-transform: uppercase; font-family: monospace; }
    .code-number { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #22d3ee; font-family: monospace; margin: 10px 0; }
    .code-desc { font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .link-box { background-color: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 11px; color: #38bdf8; margin-top: 14px; }
    .notice { font-size: 12px; color: #64748b; margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; }
    .footer { padding: 24px 32px; background-color: #080e1e; font-size: 11px; color: #475569; text-align: center; font-family: monospace; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">ARAH MARKET</div>
      <h1 class="title">Verify your trading account</h1>
      <p class="subtitle">One step away from Institutional Macro Surveillance access</p>
    </div>
    <div class="content">
      <div class="user-greeting">Hello ${name || 'Trader'},</div>
      <p>Thanks for signing up to <strong>ArahMarket Terminal</strong>. Activate your account using either of the two options below:</p>
      
      <!-- Option 1: 6-Digit Numeric Code -->
      <div class="code-box">
        <div class="code-label">ACCOUNT ACTIVATION CODE (6 DIGITS)</div>
        <div class="code-number">${displayCode}</div>
        <div class="code-desc">Enter those 6 digits on the ArahMarket app screen for instant activation.</div>
      </div>

      <!-- Option 2: Direct Activation Button -->
      <div class="btn-container">
        <a href="${verificationUrl}" target="_blank" class="btn">ACTIVATE MY ACCOUNT</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">Or copy and open this link directly in your browser:</p>
      <div class="link-box">${verificationUrl}</div>

      <div class="notice">
        <p style="margin: 0 0 6px;">⏱ <strong>Validity:</strong> This code and link are valid for <strong>24 hours</strong>.</p>
        <p style="margin: 0;">🛡 <em>If you never signed up to ArahMarket, please ignore this email.</em></p>
      </div>
    </div>
    <div class="footer">
      ARAHMARKET INTELLIGENCE TERMINAL • SECURE VERIFICATION GATEWAY
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Hello ${name || 'Trader'},

Thanks for signing up to ArahMarket Terminal.
Your account activation code: ${displayCode}

Enter those 6 digits on the ArahMarket app screen, or open this verification link:
${verificationUrl}

This code and link are valid for 24 hours.
If you did not sign up to ArahMarket, ignore this email.

Regards,
The ArahMarket team
    `.trim();

    // If live SMTP is ready, send real email
    if (this.transporter && this.isConfiguredState) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: 'ArahMarket account activation • Verify your email',
          text: textContent,
          html: htmlContent,
        });

        console.log(`[MailService] Email sent successfully to ${toEmail}. MessageId: ${info.messageId}`);
        return {
          success: true,
          messageId: info.messageId,
          verificationUrl,
          devMode: false,
        };
      } catch (err: any) {
        console.warn(`[MailService] Failed to deliver email to ${toEmail} via SMTP: ${err.message}. Activating instant verification link fallback.`);
        // Disable broken transporter on authentication or configuration errors
        if (
          err.responseCode === 535 ||
          err.message?.includes('535') ||
          err.message?.includes('Invalid login') ||
          err.message?.includes('Username and Password not accepted')
        ) {
          this.isConfiguredState = false;
        }
        return {
          success: true, // Non-blocking: user receives instant verification link
          verificationUrl,
          devMode: true,
          error: err.message,
        };
      }
    }

    // Dev mode / Fallback: print prominently to server console
    console.log('\n' + '='.repeat(70));
    console.log(`[MailService INSTANT ACTIVATION] Verification Email to: ${toEmail} (${name})`);
    console.log(`[MailService INSTANT ACTIVATION] Verification URL:`);
    console.log(`  >>> ${verificationUrl}`);
    console.log('='.repeat(70) + '\n');

    return {
      success: true,
      verificationUrl,
      devMode: true,
    };
  }

  /**
   * Generates password reset link and sends email
   */
  public async sendPasswordResetEmail(
    toEmail: string,
    name: string,
    token: string,
    baseUrl: string
  ): Promise<{ success: boolean; messageId?: string; resetUrl: string; devMode: boolean; error?: string }> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const resetUrl = `${cleanBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    this.lastSentEmail = {
      to: toEmail,
      name,
      subject: 'Reset your password • ArahMarket Terminal',
      verificationUrl: resetUrl,
      token,
      sentAt: new Date().toISOString(),
    };

    const fromAddress = this.getFromAddress('ArahMarket Security');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ArahMarket Password Reset</title>
  <style>
    body { margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; }
    .wrapper { max-width: 560px; margin: 40px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
    .header { padding: 32px; border-bottom: 1px solid #1e293b; text-align: center; background: #0f172a; }
    .title { font-size: 20px; font-weight: 700; margin: 12px 0 4px; color: #f1f5f9; font-family: monospace; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #06b6d4; color: #020617 !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; }
    .link-box { background-color: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 11px; color: #38bdf8; margin-top: 14px; }
    .notice { font-size: 12px; color: #64748b; margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; }
    .footer { padding: 20px 32px; background-color: #080e1e; font-size: 11px; color: #475569; text-align: center; font-family: monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div style="display:inline-block;background:#0891b2;color:#020617;font-weight:800;font-size:11px;padding:4px 10px;border-radius:6px;font-family:monospace;">ARAH MARKET</div>
      <h1 class="title">Password reset request</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${name || 'Trader'}</strong>,</p>
      <p>We received a request to reset the password for your ArahMarket account (<code>${toEmail}</code>). Use the button below to create a new password:</p>
      <div class="btn-container">
        <a href="${resetUrl}" target="_blank" class="btn">RESET MY PASSWORD</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Or open this link manually in your browser:</p>
      <div class="link-box">${resetUrl}</div>
      <div class="notice">
        <p style="margin:0 0 6px;">⏱ <strong>Validity:</strong> This link is valid for <strong>2 hours</strong>.</p>
        <p style="margin:0;">🛡 If you did not request a password reset, secure your account or ignore this message.</p>
      </div>
    </div>
    <div class="footer">ARAHMARKET INTELLIGENCE TERMINAL • SECURITY GATEWAY</div>
  </div>
</body>
</html>
    `.trim();

    if (this.transporter && this.isConfiguredState) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: 'Reset your password • ArahMarket Terminal',
          text: `Hello ${name || 'Trader'},\n\nClick this link to reset your password:\n${resetUrl}\n\nThe link is valid for 2 hours.`,
          html: htmlContent,
        });
        return { success: true, messageId: info.messageId, resetUrl, devMode: false };
      } catch (err: any) {
        console.warn(`[MailService] SMTP failed for password reset: ${err.message}. Using fallback link.`);
        return { success: true, resetUrl, devMode: true, error: err.message };
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`[MailService RESET LINK] Password Reset for: ${toEmail}`);
    console.log(`  >>> ${resetUrl}`);
    console.log('='.repeat(70) + '\n');

    return { success: true, resetUrl, devMode: true };
  }

  /**
   * Generates passwordless magic login link and sends email
   */
  public async sendMagicLinkEmail(
    toEmail: string,
    name: string,
    token: string,
    baseUrl: string
  ): Promise<{ success: boolean; messageId?: string; magicUrl: string; devMode: boolean; error?: string }> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const magicUrl = `${cleanBaseUrl}/api/auth/magic-link?token=${encodeURIComponent(token)}`;

    this.lastSentEmail = {
      to: toEmail,
      name,
      subject: 'Instant sign-in link • ArahMarket Terminal',
      verificationUrl: magicUrl,
      token,
      sentAt: new Date().toISOString(),
    };

    const fromAddress = this.getFromAddress('ArahMarket Access');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Sign in to ArahMarket</title>
  <style>
    body { margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; }
    .wrapper { max-width: 560px; margin: 40px auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
    .header { padding: 32px; border-bottom: 1px solid #1e293b; text-align: center; background: #0f172a; }
    .title { font-size: 20px; font-weight: 700; margin: 12px 0 4px; color: #f1f5f9; font-family: monospace; }
    .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #06b6d4; color: #020617 !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; }
    .link-box { background-color: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 11px; color: #38bdf8; margin-top: 14px; }
    .notice { font-size: 12px; color: #64748b; margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; }
    .footer { padding: 20px 32px; background-color: #080e1e; font-size: 11px; color: #475569; text-align: center; font-family: monospace; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div style="display:inline-block;background:#0891b2;color:#020617;font-weight:800;font-size:11px;padding:4px 10px;border-radius:6px;font-family:monospace;">ARAH MARKET</div>
      <h1 class="title">Passwordless sign-in</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${name || 'Trader'}</strong>,</p>
      <p>Use this secure one-time link to sign in to the ArahMarket Terminal without typing a password:</p>
      <div class="btn-container">
        <a href="${magicUrl}" target="_blank" class="btn">SIGN IN TO THE TERMINAL NOW</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Or open this link in your browser:</p>
      <div class="link-box">${magicUrl}</div>
      <div class="notice">
        <p style="margin:0 0 6px;">⏱ <strong>Validity:</strong> This link is valid for <strong>1 hour</strong> and a single use.</p>
      </div>
    </div>
    <div class="footer">ARAHMARKET INTELLIGENCE TERMINAL • SECURE ONE-CLICK ACCESS</div>
  </div>
</body>
</html>
    `.trim();

    if (this.transporter && this.isConfiguredState) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: 'Instant sign-in link • ArahMarket Terminal',
          text: `Hello ${name || 'Trader'},\n\nClick this link to sign in to the ArahMarket Terminal:\n${magicUrl}\n\nThe link is valid for 1 hour.`,
          html: htmlContent,
        });
        return { success: true, messageId: info.messageId, magicUrl, devMode: false };
      } catch (err: any) {
        console.warn(`[MailService] SMTP failed for magic link: ${err.message}. Using fallback link.`);
        return { success: true, magicUrl, devMode: true, error: err.message };
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`[MailService MAGIC LINK] Instant Login for: ${toEmail}`);
    console.log(`  >>> ${magicUrl}`);
    console.log('='.repeat(70) + '\n');

    return { success: true, magicUrl, devMode: true };
  }
}

export const mailService = new MailService();

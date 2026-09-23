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

class MailService {
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
        message: 'Kredensial SMTP belum lengkap. Variabel SMTP_USER dan/atau SMTP_PASS belum diatur di environment.',
        details: 'Pastikan SMTP_USER (email pengirim) dan SMTP_PASS (Google App Password 16-karakter) telah diatur di konfigurasi.',
        config,
      };
    }

    if (!config.isEmailValid) {
      return {
        success: false,
        connected: false,
        testEmailSent: false,
        message: `Format SMTP_USER ("${config.userMasked}") bukan alamat email yang valid.`,
        details: 'Gunakan alamat email lengkap, contoh: trader@gmail.com',
        config,
      };
    }

    if (!this.transporter) {
      return {
        success: false,
        connected: false,
        testEmailSent: false,
        message: 'Gagal menginisialisasi transporter SMTP.',
        details: 'Periksa pengaturan host dan port SMTP.',
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
          subject: '✅ Tes Koneksi SMTP Berhasil • ArahMarket Terminal',
          text: `Halo Admin,\n\nIni adalah email uji coba (test mail) dari ArahMarket Terminal.\nKoneksi SMTP ke ${config.host}:${config.port} berhasil terverifikasi pada ${new Date().toLocaleString('id-ID')}.\nLatensi handshake: ${latencyMs} ms.\n\nSalam,\nArahMarket System Engine`,
          html: `
            <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #1e293b;border-radius:12px;background:#020617;color:#f8fafc;">
              <div style="display:inline-block;padding:4px 10px;background:#0891b2;color:#020617;font-weight:800;font-size:11px;border-radius:6px;font-family:monospace;">ARAHMARKET SMTP VERIFIER</div>
              <h2 style="color:#38bdf8;margin:16px 0 8px;font-size:20px;">Koneksi SMTP Berhasil Diverifikasi!</h2>
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;">Kredensial SMTP Anda valid dan server email siap mengirimkan tautan verifikasi email akun baru serta email pemulihan kata sandi pengguna.</p>
              <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;margin:16px 0;font-family:monospace;font-size:12px;color:#38bdf8;line-height:1.7;">
                <div>• Host: <strong>${config.host}:${config.port}</strong></div>
                <div>• Pengirim: <strong>${config.userMasked}</strong></div>
                <div>• Latensi Handshake: <strong>${latencyMs} ms</strong></div>
                <div>• Waktu Uji: <strong>${new Date().toLocaleString('id-ID')}</strong></div>
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
          'Kata sandi atau pengguna ditolak (Error 535). Jika menggunakan Gmail, pastikan Anda menggunakan Google App Password 16 karakter (bukan kata sandi login biasa akun Google) dan pastikan Verifikasi 2 Langkah (2FA) telah aktif di akun Google.';
      } else if (errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
        hint = `Gagal terhubung ke host ${config.host}:${config.port}. Periksa apakah port diblokir oleh firewall atau alamat host salah.`;
      } else if (errMsg.includes('ENOTFOUND')) {
        hint = `Alamat host ${config.host} tidak ditemukan (DNS lookup failed).`;
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
      subject: 'Aktivasi Akun ArahMarket • Verifikasi Email Anda',
      verificationUrl,
      token,
      sentAt: new Date().toISOString(),
    };

    const fromAddress = this.getFromAddress('ArahMarket Terminal');

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email ArahMarket</title>
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
      <h1 class="title">Verifikasi Akun Trading Anda</h1>
      <p class="subtitle">Satu langkah lagi untuk membuka akses Institutional Macro Surveillance</p>
    </div>
    <div class="content">
      <div class="user-greeting">Halo ${name || 'Trader'},</div>
      <p>Terima kasih telah mendaftar di <strong>ArahMarket Terminal</strong>. Untuk mengaktifkan akun Anda, Anda dapat menggunakan salah satu dari 2 cara mudah di bawah ini:</p>
      
      <!-- Option 1: 6-Digit Numeric Code -->
      <div class="code-box">
        <div class="code-label">KODE AKTIVASI AKUN (6 DIGIT)</div>
        <div class="code-number">${displayCode}</div>
        <div class="code-desc">Ketikkan 6 angka di atas langsung pada layar aplikasi ArahMarket untuk aktivasi instan.</div>
      </div>

      <!-- Option 2: Direct Activation Button -->
      <div class="btn-container">
        <a href="${verificationUrl}" target="_blank" class="btn">AKTIFKAN AKUN SAYA</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">Atau salin dan buka tautan berikut langsung di peramban Anda:</p>
      <div class="link-box">${verificationUrl}</div>

      <div class="notice">
        <p style="margin: 0 0 6px;">⏱ <strong>Masa Berlaku:</strong> Kode dan tautan ini berlaku selama <strong>24 jam</strong>.</p>
        <p style="margin: 0;">🛡 <em>Jika Anda tidak pernah mendaftar di ArahMarket, silakan abaikan email ini.</em></p>
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
Halo ${name || 'Trader'},

Terima kasih telah mendaftar di ArahMarket Terminal.
Kode aktivasi akun Anda: ${displayCode}

Masukkan 6 angka tersebut pada layar aplikasi ArahMarket, atau buka tautan verifikasi berikut:
${verificationUrl}

Kode dan tautan ini berlaku selama 24 jam.
Jika Anda tidak merasa mendaftar di ArahMarket, abaikan email ini.

Salam,
Tim ArahMarket
    `.trim();

    // If live SMTP is ready, send real email
    if (this.transporter && this.isConfiguredState) {
      try {
        const info = await this.transporter.sendMail({
          from: fromAddress,
          to: toEmail,
          subject: 'Aktivasi Akun ArahMarket • Verifikasi Email Anda',
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
      subject: 'Atur Ulang Kata Sandi • ArahMarket Terminal',
      verificationUrl: resetUrl,
      token,
      sentAt: new Date().toISOString(),
    };

    const fromAddress = this.getFromAddress('ArahMarket Security');

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Reset Kata Sandi ArahMarket</title>
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
      <h1 class="title">Permintaan Reset Kata Sandi</h1>
    </div>
    <div class="content">
      <p>Halo <strong>${name || 'Trader'}</strong>,</p>
      <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun ArahMarket Anda (<code>${toEmail}</code>). Klik tombol di bawah ini untuk membuat kata sandi baru:</p>
      <div class="btn-container">
        <a href="${resetUrl}" target="_blank" class="btn">RESET KATA SANDI SAYA</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Atau buka tautan ini secara manual di peramban Anda:</p>
      <div class="link-box">${resetUrl}</div>
      <div class="notice">
        <p style="margin:0 0 6px;">⏱ <strong>Masa Berlaku:</strong> Tautan ini hanya berlaku selama <strong>2 jam</strong>.</p>
        <p style="margin:0;">🛡 Jika Anda tidak meminta reset kata sandi, amankan akun Anda atau abaikan pesan ini.</p>
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
          subject: 'Atur Ulang Kata Sandi • ArahMarket Terminal',
          text: `Halo ${name || 'Trader'},\n\nKlik tautan ini untuk mereset kata sandi Anda:\n${resetUrl}\n\nTautan berlaku 2 jam.`,
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
      subject: 'Tautan Masuk Langsung (Magic Link) • ArahMarket Terminal',
      verificationUrl: magicUrl,
      token,
      sentAt: new Date().toISOString(),
    };

    const fromAddress = this.getFromAddress('ArahMarket Access');

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Tautan Masuk ArahMarket</title>
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
      <h1 class="title">Masuk Cepat Tanpa Kata Sandi</h1>
    </div>
    <div class="content">
      <p>Halo <strong>${name || 'Trader'}</strong>,</p>
      <p>Gunakan tautan aman sekali pakai di bawah ini untuk langsung masuk ke ArahMarket Terminal tanpa mengetikkan kata sandi:</p>
      <div class="btn-container">
        <a href="${magicUrl}" target="_blank" class="btn">MASUK KE TERMINAL SEKARANG</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Atau buka tautan ini di peramban Anda:</p>
      <div class="link-box">${magicUrl}</div>
      <div class="notice">
        <p style="margin:0 0 6px;">⏱ <strong>Masa Berlaku:</strong> Tautan ini hanya berlaku selama <strong>1 jam</strong> untuk 1 kali penggunaan.</p>
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
          subject: 'Tautan Masuk Langsung (Magic Link) • ArahMarket Terminal',
          text: `Halo ${name || 'Trader'},\n\nKlik tautan ini untuk langsung masuk ke ArahMarket Terminal:\n${magicUrl}\n\nTautan berlaku 1 jam.`,
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

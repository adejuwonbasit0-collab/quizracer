import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: AppConfigService) {
    if (config.emailEnabled) {
      this.transporter = nodemailer.createTransport({
        host:   config.smtpHost,
        port:   config.smtpPort,
        secure: config.smtpSecure,
        auth: { user: config.smtpUser, pass: config.smtpPass },
        pool: true,
        maxConnections: 5,
      });

      this.transporter.verify().then(() => {
        this.logger.log('SMTP connection verified');
      }).catch((err) => {
        this.logger.warn(`SMTP verify failed: ${err.message}`);
      });
    } else {
      this.logger.warn('Email not configured — emails will be logged only');
    }
  }

  async sendVerificationEmail(
    to: string,
    displayName: string,
    token: string,
  ): Promise<void> {
    const url = `${this.config.frontendUrl}/verify-email?token=${token}`;
    await this.send({
      to,
      subject: 'Verify your QuizRacer account',
      html: this.buildEmailTemplate({
        title: 'Welcome to QuizRacer! 🏎️',
        preheader: 'Verify your email to start racing',
        heading: `Hey ${displayName}!`,
        body: `
          <p>Thanks for joining QuizRacer. You're one step away from the track!</p>
          <p>Click the button below to verify your email address:</p>
        `,
        ctaText: 'Verify Email',
        ctaUrl: url,
        footnote: 'This link expires in 24 hours. If you didn\'t create an account, ignore this email.',
      }),
    });
  }

  async sendPasswordReset(
    to: string,
    displayName: string,
    token: string,
  ): Promise<void> {
    const url = `${this.config.frontendUrl}/reset-password?token=${token}`;
    await this.send({
      to,
      subject: 'Reset your QuizRacer password',
      html: this.buildEmailTemplate({
        title: 'Password Reset',
        preheader: 'Reset your QuizRacer password',
        heading: `Hey ${displayName},`,
        body: `
          <p>We received a request to reset your password.</p>
          <p>Click the button below to choose a new password:</p>
        `,
        ctaText: 'Reset Password',
        ctaUrl: url,
        footnote: 'This link expires in 1 hour. If you didn\'t request a reset, you can safely ignore this email.',
      }),
    });
  }

  async sendTournamentInvite(
    to: string,
    displayName: string,
    tournamentName: string,
    startAt: Date,
  ): Promise<void> {
    const url = `${this.config.frontendUrl}/tournaments`;
    await this.send({
      to,
      subject: `You're in — ${tournamentName} starts soon!`,
      html: this.buildEmailTemplate({
        title: `Tournament: ${tournamentName}`,
        preheader: `Your tournament starts ${startAt.toLocaleDateString()}`,
        heading: `Ready to race, ${displayName}?`,
        body: `
          <p>The <strong>${tournamentName}</strong> tournament you registered for is starting soon.</p>
          <p><strong>Date:</strong> ${startAt.toLocaleString()}</p>
          <p>Make sure you're ready and logged in before it begins!</p>
        `,
        ctaText: 'View Tournament',
        ctaUrl: url,
        footnote: '',
      }),
    });
  }

  async sendWelcomeEmail(to: string, displayName: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to QuizRacer!',
      html: this.buildEmailTemplate({
        title: 'Welcome to the track! 🏁',
        preheader: 'Your QuizRacer journey begins now',
        heading: `Welcome, ${displayName}!`,
        body: `
          <p>Your account is all set. Here's what you can do:</p>
          <ul>
            <li>🏎️ Race against others in real-time typing races</li>
            <li>🧠 Test your knowledge in quiz races</li>
            <li>🏆 Climb the global leaderboard</li>
            <li>⌨️ Improve your typing with the Mavis Beacon-style tutor</li>
          </ul>
          <p>Start with a practice race to warm up, then jump into multiplayer!</p>
        `,
        ctaText: 'Start Racing',
        ctaUrl: `${this.config.frontendUrl}/play`,
        footnote: '',
      }),
    });
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      // Dev/test: log instead of send
      this.logger.debug(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.config.emailFromName}" <${this.config.emailFrom}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.debug(`Email sent to ${options.to}: ${options.subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${err.message}`);
      throw err;
    }
  }

  private buildEmailTemplate(opts: {
    title: string;
    preheader: string;
    heading: string;
    body: string;
    ctaText: string;
    ctaUrl: string;
    footnote: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0f0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid #2a2a4a; }
    .header { background: linear-gradient(135deg, #6c47ff, #00d4ff); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; font-weight: 700; }
    .body { padding: 32px; color: #c4c4e0; font-size: 16px; line-height: 1.6; }
    .body h2 { color: #ffffff; font-size: 22px; margin-top: 0; }
    .body p { margin: 12px 0; }
    .body ul { padding-left: 20px; }
    .body li { margin: 8px 0; }
    .cta { text-align: center; padding: 8px 0 24px; }
    .cta a {
      display: inline-block;
      background: linear-gradient(135deg, #6c47ff, #00d4ff);
      color: #fff !important;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 16px;
    }
    .footer { padding: 16px 32px 24px; color: #666; font-size: 13px; }
    .preheader { display: none; max-height: 0; overflow: hidden; }
  </style>
</head>
<body>
  <span class="preheader">${opts.preheader}</span>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>⌨️ QuizRacer</h1>
      </div>
      <div class="body">
        <h2>${opts.heading}</h2>
        ${opts.body}
      </div>
      ${opts.ctaText ? `
      <div class="cta">
        <a href="${opts.ctaUrl}">${opts.ctaText}</a>
      </div>` : ''}
      ${opts.footnote ? `<div class="footer">${opts.footnote}</div>` : ''}
    </div>
    <p style="text-align:center;color:#444;font-size:12px;margin-top:20px;">
      © ${new Date().getFullYear()} QuizRacer. All rights reserved.
    </p>
  </div>
</body>
</html>`;
  }
}

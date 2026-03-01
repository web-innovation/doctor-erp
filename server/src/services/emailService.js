/**
 * Email Service with OAuth2 Support
 * Supports Gmail, Microsoft Outlook, and standard SMTP
 * HIPAA-compliant with audit logging
 */

import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

class EmailService {
  constructor() {
    this.transporter = null;
    this.provider = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter based on provider type
   * @param {Object} config - Email configuration from database or env
   */
  async initialize(config = null) {
    try {
      // Try to get config from database first (clinic settings)
      if (!config) {
        config = await this.getEmailConfigFromDB();
      }

      // Fall back to environment variables
      if (!config) {
        config = this.getEmailConfigFromEnv();
      }

      if (!config || !config.provider) {
        logger.warn('Email service: No configuration found. Email notifications disabled.');
        return false;
      }

      this.provider = config.provider;

      switch (config.provider) {
        case 'gmail':
          this.transporter = await this.createGmailTransporter(config);
          break;
        case 'gmail-app-password':
          this.transporter = await this.createGmailAppPasswordTransporter(config);
          break;
        case 'outlook':
          this.transporter = await this.createOutlookTransporter(config);
          break;
        case 'smtp':
          this.transporter = await this.createSMTPTransporter(config);
          break;
        default:
          throw new Error(`Unknown email provider: ${config.provider}`);
      }

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      logger.info(`Email service initialized with ${config.provider} provider`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Create Gmail OAuth2 transporter
   * Requires: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN
   */
  async createGmailTransporter(config) {
    const { clientId, clientSecret, refreshToken, userEmail } = config;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Gmail OAuth2 requires clientId, clientSecret, and refreshToken');
    }

    // Get fresh access token using refresh token
    const accessToken = await this.getGmailAccessToken(clientId, clientSecret, refreshToken);

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: userEmail,
        clientId,
        clientSecret,
        refreshToken,
        accessToken,
      },
    });
  }

  /**
   * Get Gmail access token using refresh token
   */
  async getGmailAccessToken(clientId, clientSecret, refreshToken) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`OAuth2 error: ${data.error_description || data.error}`);
      }

      return data.access_token;
    } catch (error) {
      logger.error('Failed to get Gmail access token:', error);
      throw new Error(`Failed to refresh Gmail access token: ${error.message}`);
    }
  }

  /**
   * Create Gmail transporter using App Password (simpler alternative to OAuth2)
   * Requires: userEmail, appPassword
   * 
   * How to get App Password:
   * 1. Enable 2-Factor Authentication on Google Account
   * 2. Go to https://myaccount.google.com/apppasswords
   * 3. Generate a new App Password for "Mail"
   */
  async createGmailAppPasswordTransporter(config) {
    const { userEmail, appPassword } = config;

    if (!userEmail || !appPassword) {
      throw new Error('Gmail App Password requires userEmail and appPassword');
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: userEmail,
        pass: appPassword,
      },
    });
  }

  /**
   * Create Microsoft Outlook OAuth2 transporter
   * Requires: CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, TENANT_ID
   */
  async createOutlookTransporter(config) {
    const { clientId, clientSecret, refreshToken, tenantId, userEmail } = config;

    if (!clientId || !clientSecret || !refreshToken || !tenantId) {
      throw new Error('Outlook OAuth2 requires clientId, clientSecret, refreshToken, and tenantId');
    }

    // Get fresh access token using refresh token
    const accessToken = await this.getOutlookAccessToken(clientId, clientSecret, refreshToken, tenantId);

    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        type: 'OAuth2',
        user: userEmail,
        clientId,
        clientSecret,
        refreshToken,
        accessToken,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  /**
   * Get Outlook access token using refresh token
   */
  async getOutlookAccessToken(clientId, clientSecret, refreshToken, tenantId) {
    try {
      const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://outlook.office365.com/.default',
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`OAuth2 error: ${data.error_description || data.error}`);
      }

      return data.access_token;
    } catch (error) {
      logger.error('Failed to get Outlook access token:', error);
      throw new Error(`Failed to refresh Outlook access token: ${error.message}`);
    }
  }

  /**
   * Create standard SMTP transporter (SES, SendGrid, etc.)
   */
  async createSMTPTransporter(config) {
    const { host, port, user, password, secure } = config;

    if (!host || !user || !password) {
      throw new Error('SMTP requires host, user, and password');
    }

    return nodemailer.createTransport({
      host,
      port: port || 587,
      secure: secure || false,
      auth: {
        user,
        pass: password,
      },
    });
  }

  /**
   * Get email configuration from database (clinic settings)
   */
  async getEmailConfigFromDB() {
    try {
      const settings = await prisma.clinicSettings?.findFirst({
        where: { key: 'email_config' },
      });

      if (settings?.value) {
        return JSON.parse(settings.value);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get email configuration from environment variables
   */
  getEmailConfigFromEnv() {
    const provider = process.env.EMAIL_PROVIDER;
    if (!provider) return null;

    const baseConfig = {
      provider,
      userEmail: process.env.EMAIL_USER || process.env.EMAIL_FROM_EMAIL || 'support@docyerp.in',
      fromName: process.env.EMAIL_FROM_NAME || 'Docsy ERP',
    };

    if (provider === 'gmail') {
      return {
        ...baseConfig,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: process.env.GMAIL_ACCESS_TOKEN,
      };
    }

    if (provider === 'gmail-app-password') {
      return {
        ...baseConfig,
        appPassword: process.env.GMAIL_APP_PASSWORD,
      };
    }

    if (provider === 'outlook') {
      return {
        ...baseConfig,
        clientId: process.env.OUTLOOK_CLIENT_ID,
        clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
        refreshToken: process.env.OUTLOOK_REFRESH_TOKEN,
        tenantId: process.env.OUTLOOK_TENANT_ID,
      };
    }

    if (provider === 'smtp') {
      return {
        ...baseConfig,
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        secure: process.env.SMTP_SECURE === 'true',
      };
    }

    return null;
  }

  /**
   * Send email with HIPAA audit logging
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(options) {
    if (!this.initialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Email service not configured. Please set up email in settings.');
      }
    }

    const { to, subject, text, html, attachments, userId, patientId, type } = options;

    try {
      const fromEmail = process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER || 'support@docyerp.in';
      const fromName = process.env.EMAIL_FROM_NAME || 'Docsy ERP';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log email notification for HIPAA audit
      await this.logEmailNotification({
        to,
        subject,
        type: type || 'general',
        status: 'sent',
        messageId: result.messageId,
        userId,
        patientId,
      });

      logger.info(`Email sent successfully to ${to}`, { messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      // Log failed attempt
      await this.logEmailNotification({
        to,
        subject,
        type: type || 'general',
        status: 'failed',
        error: error.message,
        userId,
        patientId,
      });

      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Log email notification for HIPAA compliance
   */
  async logEmailNotification(data) {
    try {
      await prisma.emailLog?.create({
        data: {
          recipientEmail: data.to,
          subject: data.subject,
          type: data.type,
          status: data.status,
          messageId: data.messageId,
          error: data.error,
          userId: data.userId,
          patientId: data.patientId,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      // Don't throw - logging failure shouldn't stop email
      logger.error('Failed to log email notification:', error);
    }
  }

  /**
   * Send appointment reminder email
   */
  async sendAppointmentReminder(appointment, patient) {
    const formattedDate = new Date(appointment.dateTime).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .appointment-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .btn { background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Appointment Reminder</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${patient.name}</strong>,</p>
            <p>This is a reminder about your upcoming appointment:</p>
            
            <div class="appointment-details">
              <p><strong>📅 Date & Time:</strong> ${formattedDate}</p>
              <p><strong>👨‍⚕️ Doctor:</strong> ${appointment.doctor?.name || 'Your Doctor'}</p>
              <p><strong>📍 Type:</strong> ${appointment.type || 'General Consultation'}</p>
              ${appointment.notes ? `<p><strong>📝 Notes:</strong> ${appointment.notes}</p>` : ''}
            </div>
            
            <p>Please arrive 10-15 minutes before your scheduled time.</p>
            <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from DocClinic ERP</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: patient.email,
      subject: `Appointment Reminder - ${formattedDate}`,
      html,
      text: `Appointment Reminder\n\nDear ${patient.name},\n\nThis is a reminder about your upcoming appointment on ${formattedDate}.\n\nPlease arrive 10-15 minutes before your scheduled time.`,
      type: 'appointment_reminder',
      patientId: patient.id,
    });
  }

  /**
   * Send prescription email
   */
  async sendPrescription(prescription, patient, pdfBuffer = null) {
    const formattedDate = new Date(prescription.createdAt).toLocaleDateString('en-IN', {
      dateStyle: 'long',
    });

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `prescription-${prescription.prescriptionNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .prescription-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💊 Your Prescription</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${patient.name}</strong>,</p>
            <p>Please find your prescription details below:</p>
            
            <div class="prescription-details">
              <p><strong>📋 Prescription #:</strong> ${prescription.prescriptionNumber}</p>
              <p><strong>📅 Date:</strong> ${formattedDate}</p>
              <p><strong>👨‍⚕️ Doctor:</strong> ${prescription.doctor?.name || 'Your Doctor'}</p>
              <p><strong>🏥 Diagnosis:</strong> ${prescription.diagnosis || 'As discussed'}</p>
            </div>
            
            ${pdfBuffer ? '<p>📎 The full prescription is attached as a PDF for your reference.</p>' : ''}
            
            <div class="warning">
              <strong>⚠️ Important:</strong> Please follow the prescribed medication schedule and complete the full course. Do not share medications with others.
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from DocClinic ERP</p>
            <p>For medical queries, please contact your healthcare provider</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: patient.email,
      subject: `Prescription #${prescription.prescriptionNumber} - ${formattedDate}`,
      html,
      text: `Your Prescription\n\nPrescription #: ${prescription.prescriptionNumber}\nDate: ${formattedDate}\nDiagnosis: ${prescription.diagnosis || 'As discussed'}\n\nPlease follow the prescribed medication schedule.`,
      attachments,
      type: 'prescription',
      patientId: patient.id,
    });
  }

  /**
   * Send bill/invoice email
   */
  async sendBill(bill, patient, pdfBuffer = null) {
    const formattedDate = new Date(bill.createdAt).toLocaleDateString('en-IN', {
      dateStyle: 'long',
    });

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `invoice-${bill.billNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .bill-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .amount { font-size: 24px; color: #10b981; font-weight: bold; }
          .status { padding: 5px 10px; border-radius: 4px; font-size: 12px; }
          .status.paid { background: #dcfce7; color: #166534; }
          .status.pending { background: #fef3c7; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧾 Invoice / Bill</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${patient.name}</strong>,</p>
            <p>Please find your bill details below:</p>
            
            <div class="bill-details">
              <p><strong>📋 Bill #:</strong> ${bill.billNumber}</p>
              <p><strong>📅 Date:</strong> ${formattedDate}</p>
              <p><strong>💰 Total Amount:</strong> <span class="amount">₹${bill.totalAmount.toFixed(2)}</span></p>
              <p><strong>📊 Status:</strong> <span class="status ${bill.status.toLowerCase()}">${bill.status}</span></p>
              ${bill.paidAmount ? `<p><strong>💵 Paid:</strong> ₹${bill.paidAmount.toFixed(2)}</p>` : ''}
              ${bill.balanceAmount ? `<p><strong>⏳ Balance:</strong> ₹${bill.balanceAmount.toFixed(2)}</p>` : ''}
            </div>
            
            ${pdfBuffer ? '<p>📎 The detailed invoice is attached as a PDF.</p>' : ''}
            
            <p>For any billing queries, please contact our front desk.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from DocClinic ERP</p>
            <p>Thank you for choosing our healthcare services</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: patient.email,
      subject: `Invoice #${bill.billNumber} - ₹${bill.totalAmount.toFixed(2)}`,
      html,
      text: `Invoice\n\nBill #: ${bill.billNumber}\nDate: ${formattedDate}\nTotal Amount: ₹${bill.totalAmount.toFixed(2)}\nStatus: ${bill.status}`,
      attachments,
      type: 'bill',
      patientId: patient.id,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(user, resetToken, resetUrl) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .btn { background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          .warning { background: #fee2e2; border: 1px solid #ef4444; padding: 10px; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </p>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from DocClinic ERP</p>
            <p>For security reasons, please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request - DocClinic',
      html,
      text: `Password Reset\n\nDear ${user.name},\n\nClick this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.`,
      type: 'password_reset',
      userId: user.id,
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user, tempPassword = null) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .credentials { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
          .btn { background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to DocClinic!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>Your account has been created successfully. Here are your login details:</p>
            
            <div class="credentials">
              <p><strong>📧 Email:</strong> ${user.email}</p>
              ${tempPassword ? `<p><strong>🔑 Temporary Password:</strong> ${tempPassword}</p>` : ''}
              <p><strong>👤 Role:</strong> ${user.role}</p>
            </div>
            
            ${tempPassword ? '<p><strong>Please change your password after your first login.</strong></p>' : ''}
            
            <p>If you have any questions, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from DocClinic ERP</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to DocClinic - Account Created',
      html,
      text: `Welcome to DocClinic!\n\nYour account has been created.\n\nEmail: ${user.email}\n${tempPassword ? `Temporary Password: ${tempPassword}\n` : ''}Role: ${user.role}\n\nPlease change your password after your first login.`,
      type: 'welcome',
      userId: user.id,
    });
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    if (!this.initialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: 'Email service not configured' };
      }
    }

    try {
      await this.transporter.verify();
      return { success: true, message: `Email service connected (${this.provider})` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance and class for testing
const emailService = new EmailService();
export { EmailService };
export default emailService;

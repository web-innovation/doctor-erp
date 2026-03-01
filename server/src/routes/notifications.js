/**
 * Email Notification Routes
 * Handles email configuration and sending notifications
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.js';
import emailService, { EmailService } from '../services/emailService.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// ==========================================
// Email Configuration Routes (Admin only)
// ==========================================

/**
 * GET /api/notifications/email/config
 * Get current email configuration (masked)
 */
router.get('/email/config', authorize('DOCTOR'), async (req, res) => {
  try {
    const config = await prisma.clinicSettings?.findFirst({
      where: { key: 'email_config', clinicId: req.user.clinicId },
    });

    if (!config?.value) {
      return res.json({
        success: true,
        data: null,
        message: 'Email not configured',
      });
    }

    const parsed = JSON.parse(config.value);
    
    // Mask sensitive fields
    const masked = {
      provider: parsed.provider,
      userEmail: parsed.userEmail,
      fromName: parsed.fromName,
      configured: true,
      // Mask secrets
      clientId: parsed.clientId ? '****' + parsed.clientId.slice(-4) : null,
      clientSecret: parsed.clientSecret ? '********' : null,
      refreshToken: parsed.refreshToken ? '********' : null,
    };

    res.json({ success: true, data: masked });
  } catch (error) {
    logger.error('Error getting email config:', error);
    res.status(500).json({ success: false, message: 'Failed to get email configuration' });
  }
});

/**
 * POST /api/notifications/email/config
 * Save email configuration (OAuth2 or SMTP)
 */
router.post('/email/config', authorize('DOCTOR'), async (req, res) => {
  try {
    const { provider, userEmail, fromName, ...credentials } = req.body;

    if (!provider || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Provider and userEmail are required',
      });
    }

    // Validate required fields based on provider
    if (provider === 'gmail') {
      if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Gmail OAuth2 requires clientId, clientSecret, and refreshToken',
        });
      }
    } else if (provider === 'gmail-app-password') {
      if (!credentials.appPassword) {
        return res.status(400).json({
          success: false,
          message: 'Gmail App Password requires appPassword',
        });
      }
    } else if (provider === 'outlook') {
      if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken || !credentials.tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Outlook OAuth2 requires clientId, clientSecret, refreshToken, and tenantId',
        });
      }
    } else if (provider === 'smtp') {
      if (!credentials.host || !credentials.user || !credentials.password) {
        return res.status(400).json({
          success: false,
          message: 'SMTP requires host, user, and password',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid provider. Must be gmail, gmail-app-password, outlook, or smtp',
      });
    }

    const configData = {
      provider,
      userEmail,
      fromName: fromName || 'DocClinic',
      ...credentials,
    };

    // Test the configuration before saving
    const testResult = await testEmailConfig(configData);
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        message: `Email configuration test failed: ${testResult.message}`,
      });
    }

    // Save or update configuration
    const existing = await prisma.clinicSettings?.findFirst({
      where: { key: 'email_config', clinicId: req.user.clinicId },
    });

    if (existing) {
      await prisma.clinicSettings?.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(configData), updatedAt: new Date() },
      });
    } else {
      await prisma.clinicSettings?.create({
        data: {
          key: 'email_config',
          value: JSON.stringify(configData),
          clinicId: req.user.clinicId,
        },
      });
    }

    // Reinitialize email service
    await emailService.initialize(configData);

    logger.info(`Email configuration updated by user ${req.user.id}`);
    res.json({ success: true, message: 'Email configuration saved successfully' });
  } catch (error) {
    logger.error('Error saving email config:', error);
    res.status(500).json({ success: false, message: 'Failed to save email configuration' });
  }
});

/**
 * POST /api/notifications/email/test
 * Test email configuration by sending a test email
 */
router.post('/email/test', authorize('DOCTOR'), async (req, res) => {
  try {
    const testResult = await emailService.testConnection();
    
    if (!testResult.success) {
      return res.status(400).json(testResult);
    }

    // Send test email to current user
    await emailService.sendEmail({
      to: req.user.email,
      subject: 'DocClinic - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #0ea5e9;">✅ Email Configuration Working!</h2>
          <p>This is a test email from DocClinic ERP.</p>
          <p>Your email notifications are configured correctly.</p>
          <p style="color: #64748b; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: 'Email Configuration Working! This is a test email from DocClinic ERP.',
      type: 'test',
      userId: req.user.id,
      clinicId: req.user.clinicId,
    });

    res.json({ success: true, message: `Test email sent to ${req.user.email}` });
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Send Notification Routes
// ==========================================

/**
 * GET /api/notifications/email/otp-template
 * Get OTP email template for clinic (editable in settings UI)
 */
router.get('/email/otp-template', authorize('DOCTOR'), async (req, res) => {
  try {
    const config = await prisma.clinicSettings?.findFirst({ where: { key: 'otp_email_template', clinicId: req.user.clinicId } });
    const template = config?.value || null;
    const placeholders = ['{{code}}', '{{expiryMinutes}}', '{{clinicName}}', '{{email}}'];
    res.json({ success: true, data: { template, placeholders } });
  } catch (error) {
    logger.error('Error getting OTP email template:', error);
    res.status(500).json({ success: false, message: 'Failed to get OTP email template' });
  }
});

/**
 * POST /api/notifications/email/otp-template
 * Save OTP email template for clinic (editable in settings UI)
 * body: { template: '<p>Your OTP is {{code}}</p>' }
 */
router.post('/email/otp-template', authorize('DOCTOR'), async (req, res) => {
  try {
    const { template } = req.body;
    if (!template) return res.status(400).json({ success: false, message: 'template is required' });

    const existing = await prisma.clinicSettings?.findFirst({ where: { key: 'otp_email_template', clinicId: req.user.clinicId } });
    if (existing) {
      await prisma.clinicSettings?.update({ where: { id: existing.id }, data: { value: template, updatedAt: new Date() } });
    } else {
      await prisma.clinicSettings?.create({ data: { key: 'otp_email_template', value: template, clinicId: req.user.clinicId } });
    }

    res.json({ success: true, message: 'OTP email template saved' });
  } catch (error) {
    logger.error('Error saving OTP email template:', error);
    res.status(500).json({ success: false, message: 'Failed to save OTP email template' });
  }
});

/**
 * POST /api/notifications/appointment-reminder/:id
 * Send appointment reminder email
 */
router.post('/appointment-reminder/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (!appointment.patient?.email) {
      return res.status(400).json({ success: false, message: 'Patient email not available' });
    }

    const result = await emailService.sendAppointmentReminder(
      {
        ...appointment,
        doctor: appointment.doctor?.user || { name: 'Doctor' },
      },
      appointment.patient
    );

    res.json({ success: true, message: 'Appointment reminder sent', data: result });
  } catch (error) {
    logger.error('Error sending appointment reminder:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/notifications/prescription/:id
 * Send prescription email
 */
router.post('/prescription/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await prisma.prescription.findUnique({
      where: { id }, // ID is UUID string, not integer
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (!prescription.patient?.email) {
      return res.status(400).json({ success: false, message: 'Patient email not available' });
    }

    // TODO: Generate PDF attachment if needed
    const result = await emailService.sendPrescription(
      {
        ...prescription,
        doctor: prescription.doctor?.user || { name: 'Doctor' },
      },
      prescription.patient
    );

    // Update prescription sent status
    await prisma.prescription.update({
      where: { id }, // ID is UUID string
      data: { sentViaEmail: true, sentAt: new Date() },
    });

    res.json({ success: true, message: 'Prescription sent via email', data: result });
  } catch (error) {
    logger.error('Error sending prescription email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/notifications/bill/:id
 * Send bill/invoice email
 */
router.post('/bill/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(id) },
      include: { patient: true },
    });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (!bill.patient?.email) {
      return res.status(400).json({ success: false, message: 'Patient email not available' });
    }

    const result = await emailService.sendBill(bill, bill.patient);

    res.json({ success: true, message: 'Invoice sent via email', data: result });
  } catch (error) {
    logger.error('Error sending bill email:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/notifications/bulk-reminders
 * Send bulk appointment reminders (for scheduled jobs)
 */
router.post('/bulk-reminders', authorize('DOCTOR'), async (req, res) => {
  try {
    const { hours = 24 } = req.body;
    
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + hours);
    
    const startOfWindow = new Date(targetTime);
    startOfWindow.setMinutes(startOfWindow.getMinutes() - 30);
    
    const endOfWindow = new Date(targetTime);
    endOfWindow.setMinutes(endOfWindow.getMinutes() + 30);

    // Find appointments in the reminder window
    const appointments = await prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: startOfWindow,
          lte: endOfWindow,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        patient: { email: { not: null } },
        clinicId: req.user.clinicId,
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    const results = {
      total: appointments.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const appointment of appointments) {
      try {
        await emailService.sendAppointmentReminder(
          {
            ...appointment,
            doctor: appointment.doctor?.user || { name: 'Doctor' },
          },
          appointment.patient
        );
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({ appointmentId: appointment.id, error: error.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Error sending bulk reminders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/notifications/email/logs
 * Get email send logs
 */
router.get('/email/logs', authorize('DOCTOR'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const logs = await prisma.emailLog?.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      include: {
        patient: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    const total = await prisma.emailLog?.count({ where });

    res.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total || 0,
          pages: Math.ceil((total || 0) / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting email logs:', error);
    res.status(500).json({ success: false, message: 'Failed to get email logs' });
  }
});

// Helper function to test email configuration
async function testEmailConfig(config) {
  try {
    const testService = new EmailService();
    await testService.initialize(config);
    await testService.transporter.verify();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ==========================================
// WhatsApp Configuration Routes
// ==========================================

/**
 * GET /api/notifications/whatsapp/config
 * Get current WhatsApp configuration (masked)
 */
router.get('/whatsapp/config', authorize('DOCTOR'), async (req, res) => {
  try {
    const config = await prisma.clinicSettings?.findFirst({
      where: { key: 'whatsapp_config', clinicId: req.user.clinicId },
    });

    if (!config?.value) {
      return res.json({
        success: true,
        data: null,
        message: 'WhatsApp not configured',
      });
    }

    const parsed = JSON.parse(config.value);
    
    // Mask sensitive fields
    const masked = {
      enabled: parsed.enabled ?? false,
      provider: parsed.provider || 'manual',
      clinicWhatsAppNumber: parsed.clinicWhatsAppNumber || '',
      clinicWhatsAppName: parsed.clinicWhatsAppName || '',
      messageTemplates: parsed.messageTemplates || {},
      configured: true,
      // Mask secrets based on provider
      twilioAccountSid: parsed.twilioAccountSid ? '****' + parsed.twilioAccountSid.slice(-4) : null,
      twilioAuthToken: parsed.twilioAuthToken ? '********' : null,
      twilioWhatsAppNumber: parsed.twilioWhatsAppNumber || null,
      wabPhoneNumberId: parsed.wabPhoneNumberId ? '****' + parsed.wabPhoneNumberId.slice(-4) : null,
      wabAccessToken: parsed.wabAccessToken ? '********' : null,
      wabBusinessAccountId: parsed.wabBusinessAccountId ? '****' + parsed.wabBusinessAccountId.slice(-4) : null,
    };

    res.json({ success: true, data: masked });
  } catch (error) {
    logger.error('Error getting WhatsApp config:', error);
    res.status(500).json({ success: false, message: 'Failed to get WhatsApp configuration' });
  }
});

/**
 * POST /api/notifications/whatsapp/config
 * Save WhatsApp configuration
 */
router.post('/whatsapp/config', authorize('DOCTOR'), async (req, res) => {
  try {
    const { 
      enabled, 
      provider, 
      clinicWhatsAppNumber, 
      clinicWhatsAppName,
      messageTemplates,
      ...credentials 
    } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required',
      });
    }

    // Validate required fields based on provider
    if (provider === 'twilio') {
      if (!credentials.twilioAccountSid || !credentials.twilioAuthToken || !credentials.twilioWhatsAppNumber) {
        return res.status(400).json({
          success: false,
          message: 'Twilio requires accountSid, authToken, and WhatsApp number',
        });
      }
    } else if (provider === 'whatsapp-business') {
      if (!credentials.wabPhoneNumberId || !credentials.wabAccessToken || !credentials.wabBusinessAccountId) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp Business API requires phoneNumberId, accessToken, and businessAccountId',
        });
      }
    }
    // 'manual' provider doesn't need validation - uses wa.me links

    const configData = {
      enabled: enabled ?? true,
      provider,
      clinicWhatsAppNumber: clinicWhatsAppNumber || '',
      clinicWhatsAppName: clinicWhatsAppName || '',
      messageTemplates: messageTemplates || {},
      ...credentials,
    };

    // Save or update configuration
    const existing = await prisma.clinicSettings?.findFirst({
      where: { key: 'whatsapp_config', clinicId: req.user.clinicId },
    });

    if (existing) {
      await prisma.clinicSettings?.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(configData), updatedAt: new Date() },
      });
    } else {
      await prisma.clinicSettings?.create({
        data: {
          key: 'whatsapp_config',
          value: JSON.stringify(configData),
          clinicId: req.user.clinicId,
        },
      });
    }

    logger.info(`WhatsApp configuration updated by user ${req.user.id}`);
    res.json({ success: true, message: 'WhatsApp configuration saved successfully' });
  } catch (error) {
    logger.error('Error saving WhatsApp config:', error);
    res.status(500).json({ success: false, message: 'Failed to save WhatsApp configuration' });
  }
});

/**
 * POST /api/notifications/whatsapp/test
 * Test WhatsApp configuration by generating a test message
 */
router.post('/whatsapp/test', authorize('DOCTOR'), async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for testing',
      });
    }

    const config = await prisma.clinicSettings?.findFirst({
      where: { key: 'whatsapp_config', clinicId: req.user.clinicId },
    });

    if (!config?.value) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp is not configured. Please save configuration first.',
      });
    }

    const whatsappConfig = JSON.parse(config.value);
    const clinicName = whatsappConfig.clinicWhatsAppName || 'DocClinic';
    
    const testMessage = `Hello! This is a test message from ${clinicName}.\n\n` +
      `✅ Your WhatsApp notification system is configured correctly.\n\n` +
      `Sent at: ${new Date().toLocaleString()}`;

    if (whatsappConfig.provider === 'manual') {
      // For manual provider, return the wa.me URL
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(testMessage)}`;
      
      return res.json({ 
        success: true, 
        message: 'Test message URL generated',
        whatsappUrl,
        provider: 'manual',
      });
    } else if (whatsappConfig.provider === 'twilio') {
      // Import and use Twilio
      try {
        const twilio = await import('twilio');
        const client = twilio.default(whatsappConfig.twilioAccountSid, whatsappConfig.twilioAuthToken);
        
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        await client.messages.create({
          body: testMessage,
          from: `whatsapp:${whatsappConfig.twilioWhatsAppNumber}`,
          to: `whatsapp:+${cleanPhone}`,
        });

        return res.json({ 
          success: true, 
          message: `Test WhatsApp message sent to ${phoneNumber}`,
          provider: 'twilio',
        });
      } catch (twilioError) {
        logger.error('Twilio test failed:', twilioError);
        return res.status(400).json({
          success: false,
          message: `Twilio error: ${twilioError.message}`,
        });
      }
    } else if (whatsappConfig.provider === 'whatsapp-business') {
      // Use WhatsApp Business Cloud API
      try {
        const axios = (await import('axios')).default;
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${whatsappConfig.wabPhoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: { body: testMessage },
          },
          {
            headers: {
              'Authorization': `Bearer ${whatsappConfig.wabAccessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return res.json({ 
          success: true, 
          message: `Test WhatsApp message sent to ${phoneNumber}`,
          provider: 'whatsapp-business',
          messageId: response.data?.messages?.[0]?.id,
        });
      } catch (wabError) {
        logger.error('WhatsApp Business API test failed:', wabError.response?.data || wabError);
        return res.status(400).json({
          success: false,
          message: wabError.response?.data?.error?.message || wabError.message,
        });
      }
    }

    res.status(400).json({ success: false, message: 'Unknown provider' });
  } catch (error) {
    logger.error('Error testing WhatsApp:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

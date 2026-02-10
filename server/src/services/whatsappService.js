/**
 * WhatsApp Service
 * Handles WhatsApp message sending via multiple methods:
 * 1. WhatsApp Web URL (wa.me) - Opens WhatsApp with pre-filled message
 * 2. WhatsApp Bot API - If the bot is running locally
 * 3. Twilio WhatsApp API - If configured
 * 4. WhatsApp Business Cloud API - If configured
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

class WhatsAppService {
  constructor() {
    this.botUrl = process.env.WHATSAPP_BOT_URL || 'http://localhost:3002';
    // Environment fallbacks
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    // Clinic-specific config cache
    this.clinicConfigCache = new Map();
  }

  /**
   * Load WhatsApp configuration for a clinic
   * @param {string} clinicId - Clinic ID
   * @returns {Promise<Object|null>} - Config object or null
   */
  async getClinicConfig(clinicId) {
    if (!clinicId) return null;
    
    // Check cache first (expire after 5 minutes)
    const cached = this.clinicConfigCache.get(clinicId);
    if (cached && cached.timestamp > Date.now() - 300000) {
      return cached.config;
    }

    try {
      const configRecord = await prisma.clinicSettings?.findFirst({
        where: { key: 'whatsapp_config', clinicId },
      });

      if (!configRecord?.value) return null;

      const config = JSON.parse(configRecord.value);
      
      // Cache the config
      this.clinicConfigCache.set(clinicId, {
        config,
        timestamp: Date.now(),
      });

      return config;
    } catch (error) {
      logger.error('Error loading WhatsApp config:', error);
      return null;
    }
  }

  /**
   * Format phone number to international format
   * @param {string} phone - Phone number
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, assume Indian number
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    
    // If doesn't start with country code (assuming Indian), add 91
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Generate WhatsApp Web URL with pre-filled message
   * @param {string} phone - Recipient phone number
   * @param {string} message - Message to send
   * @returns {string} - WhatsApp Web URL
   */
  generateWhatsAppUrl(phone, message) {
    const formattedPhone = this.formatPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  /**
   * Generate prescription message
   * @param {Object} prescription - Prescription object with patient, medicines, etc.
   * @param {Object} clinic - Clinic details
   * @returns {string} - Formatted message
   */
  generatePrescriptionMessage(prescription, clinic) {
    const date = new Date(prescription.date).toLocaleDateString('en-IN');
    
    let message = `🏥 *${clinic?.name || 'DocClinic'}*\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `📋 *Prescription*\n\n`;
    message += `👤 Patient: ${prescription.patient?.name}\n`;
    message += `📅 Date: ${date}\n`;
    message += `🔢 Rx No: ${prescription.prescriptionNo}\n\n`;

    // Diagnosis
    let diagnosis = '-';
    try {
      const diagArr = JSON.parse(prescription.diagnosis || '[]');
      diagnosis = diagArr.length > 0 ? diagArr.join(', ') : '-';
    } catch {
      diagnosis = prescription.diagnosis || '-';
    }
    message += `🩺 *Diagnosis:* ${diagnosis}\n\n`;

    // Medicines
    if (prescription.medicines?.length > 0) {
      message += `💊 *Medicines:*\n`;
      prescription.medicines.forEach((m, idx) => {
        const name = m.pharmacyProduct?.name || m.medicineName;
        message += `${idx + 1}. ${name}\n`;
        message += `   Dosage: ${m.dosage || '-'}\n`;
        message += `   Duration: ${m.duration || '-'}\n`;
        if (m.instructions) {
          message += `   Instructions: ${m.instructions}\n`;
        }
      });
      message += `\n`;
    }

    // Lab Tests
    if (prescription.labTests?.length > 0) {
      message += `🧪 *Lab Tests:*\n`;
      prescription.labTests.forEach((test, idx) => {
        message += `${idx + 1}. ${test.testName}`;
        if (test.instructions) {
          message += ` (${test.instructions})`;
        }
        message += `\n`;
      });
      message += `\n`;
    }

    // Advice
    if (prescription.advice) {
      message += `📝 *Advice:* ${prescription.advice}\n\n`;
    }

    // Follow-up
    if (prescription.followUpDate) {
      const followUp = new Date(prescription.followUpDate).toLocaleDateString('en-IN');
      message += `📆 *Follow-up:* ${followUp}\n\n`;
    }

    // Clinic details
    message += `━━━━━━━━━━━━━━━\n`;
    if (clinic?.address) {
      message += `📍 ${clinic.address}\n`;
    }
    if (clinic?.phone) {
      message += `📞 ${clinic.phone}\n`;
    }
    
    message += `\n_This is an automated message from ${clinic?.name || 'DocClinic'}_`;

    return message;
  }

  /**
   * Generate appointment reminder message
   * @param {Object} appointment - Appointment object
   * @param {Object} clinic - Clinic details
   * @returns {string} - Formatted message
   */
  generateAppointmentReminderMessage(appointment, clinic) {
    const date = new Date(appointment.date).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const time = appointment.time || '';

    let message = `🏥 *${clinic?.name || 'DocClinic'}*\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `📅 *Appointment Reminder*\n\n`;
    message += `Dear ${appointment.patient?.name},\n\n`;
    message += `This is a reminder for your upcoming appointment:\n\n`;
    message += `📆 Date: ${date}\n`;
    message += `⏰ Time: ${time}\n`;
    if (appointment.reason) {
      message += `📋 Reason: ${appointment.reason}\n`;
    }
    message += `\n`;
    
    // Clinic details
    message += `━━━━━━━━━━━━━━━\n`;
    if (clinic?.address) {
      message += `📍 ${clinic.address}\n`;
    }
    if (clinic?.phone) {
      message += `📞 ${clinic.phone}\n`;
    }
    
    message += `\nPlease arrive 10 minutes before your appointment time.\n`;
    message += `\n_Reply with 'CONFIRM' to confirm or 'CANCEL' to cancel._`;

    return message;
  }

  /**
   * Generate bill notification message
   * @param {Object} bill - Bill object
   * @param {Object} clinic - Clinic details
   * @returns {string} - Formatted message
   */
  generateBillMessage(bill, clinic) {
    const date = new Date(bill.date || bill.createdAt).toLocaleDateString('en-IN');

    let message = `🏥 *${clinic?.name || 'DocClinic'}*\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `🧾 *Invoice*\n\n`;
    message += `👤 Patient: ${bill.patient?.name}\n`;
    message += `📅 Date: ${date}\n`;
    message += `🔢 Invoice No: ${bill.invoiceNo || bill.id}\n\n`;

    // Items
    if (bill.items?.length > 0) {
      message += `📋 *Items:*\n`;
      bill.items.forEach((item, idx) => {
        message += `${idx + 1}. ${item.description || item.name}\n`;
        message += `   Qty: ${item.quantity} × ₹${item.price} = ₹${item.quantity * item.price}\n`;
      });
      message += `\n`;
    }

    // Totals
    message += `━━━━━━━━━━━━━━━\n`;
    if (bill.subtotal) {
      message += `Subtotal: ₹${bill.subtotal}\n`;
    }
    if (bill.cgst) {
      message += `CGST: ₹${bill.cgst}\n`;
    }
    if (bill.sgst) {
      message += `SGST: ₹${bill.sgst}\n`;
    }
    if (bill.discount) {
      message += `Discount: -₹${bill.discount}\n`;
    }
    message += `*Total: ₹${bill.total || bill.grandTotal}*\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;

    // Payment status
    message += `💳 Status: ${bill.status === 'PAID' ? '✅ Paid' : '⏳ Pending'}\n\n`;

    // Clinic details
    if (clinic?.address) {
      message += `📍 ${clinic.address}\n`;
    }
    if (clinic?.phone) {
      message += `📞 ${clinic.phone}\n`;
    }
    
    message += `\n_Thank you for visiting ${clinic?.name || 'DocClinic'}_`;

    return message;
  }

  /**
   * Send WhatsApp message via available method
   * Returns URL if direct sending is not available
   * @param {Object} options - Options
   * @param {string} options.phone - Recipient phone
   * @param {string} options.message - Message text
   * @param {string} options.clinicId - Clinic ID for clinic-specific config
   * @returns {Promise<Object>} - Result with success, method, and optional url
   */
  async sendMessage({ phone, message, clinicId }) {
    if (!phone) {
      throw new Error('Phone number is required');
    }

    const formattedPhone = this.formatPhoneNumber(phone);
    const whatsappUrl = this.generateWhatsAppUrl(phone, message);

    // Load clinic-specific config
    const clinicConfig = clinicId ? await this.getClinicConfig(clinicId) : null;
    
    // Determine which credentials to use
    const twilioSid = clinicConfig?.twilioAccountSid || this.twilioAccountSid;
    const twilioToken = clinicConfig?.twilioAuthToken || this.twilioAuthToken;
    const twilioNumber = clinicConfig?.twilioWhatsAppNumber || this.twilioWhatsAppNumber;
    const provider = clinicConfig?.provider || 'manual';

    // If provider is manual or not configured, return URL
    if (provider === 'manual' || !clinicConfig?.enabled) {
      logger.info(`WhatsApp URL generated for ${formattedPhone} (manual mode)`);
      return { 
        success: true, 
        method: 'url',
        url: whatsappUrl,
        message: 'WhatsApp URL generated. Click to send message.' 
      };
    }

    // Try WhatsApp Business Cloud API if configured
    if (provider === 'whatsapp-business' && clinicConfig?.wabPhoneNumberId && clinicConfig?.wabAccessToken) {
      try {
        const axios = (await import('axios')).default;
        
        await axios.post(
          `https://graph.facebook.com/v18.0/${clinicConfig.wabPhoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: message },
          },
          {
            headers: {
              'Authorization': `Bearer ${clinicConfig.wabAccessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        logger.info(`WhatsApp message sent via WAB Cloud API to ${formattedPhone}`);
        return { 
          success: true, 
          method: 'whatsapp-business',
          message: 'Message sent via WhatsApp Business API' 
        };
      } catch (error) {
        logger.warn('WhatsApp Business API failed:', error.response?.data || error.message);
        // Fall through to other methods
      }
    }

    // Try Twilio if configured
    if ((provider === 'twilio' || !provider) && twilioSid && twilioToken && twilioNumber) {
      try {
        const twilio = await import('twilio');
        const client = twilio.default(twilioSid, twilioToken);
        
        await client.messages.create({
          body: message,
          from: `whatsapp:${twilioNumber}`,
          to: `whatsapp:+${formattedPhone}`
        });

        logger.info(`WhatsApp message sent via Twilio to ${formattedPhone}`);
        return { 
          success: true, 
          method: 'twilio',
          message: 'Message sent via WhatsApp' 
        };
      } catch (error) {
        logger.warn('Twilio WhatsApp failed:', error.message);
      }
    }

    // Return WhatsApp Web URL as fallback
    logger.info(`WhatsApp URL generated for ${formattedPhone} (fallback)`);
    return { 
      success: true, 
      method: 'url',
      url: whatsappUrl,
      message: 'WhatsApp URL generated. Click to send message.' 
    };
  }

  /**
   * Send prescription via WhatsApp
   * @param {Object} prescription - Prescription with patient, medicines, clinic
   * @returns {Promise<Object>} - Result
   */
  async sendPrescription(prescription) {
    const message = this.generatePrescriptionMessage(prescription, prescription.clinic);
    return this.sendMessage({
      phone: prescription.patient?.phone,
      message,
      clinicId: prescription.clinicId || prescription.clinic?.id,
    });
  }

  /**
   * Send appointment reminder via WhatsApp
   * @param {Object} appointment - Appointment with patient, clinic
   * @returns {Promise<Object>} - Result
   */
  async sendAppointmentReminder(appointment) {
    const message = this.generateAppointmentReminderMessage(appointment, appointment.clinic);
    return this.sendMessage({
      phone: appointment.patient?.phone,
      message,
      clinicId: appointment.clinicId || appointment.clinic?.id,
    });
  }

  /**
   * Send bill via WhatsApp
   * @param {Object} bill - Bill with patient, items, clinic
   * @returns {Promise<Object>} - Result
   */
  async sendBill(bill) {
    const message = this.generateBillMessage(bill, bill.clinic);
    return this.sendMessage({
      phone: bill.patient?.phone,
      message,
      clinicId: bill.clinicId || bill.clinic?.id,
    });
  }
}

const whatsappService = new WhatsAppService();
export { WhatsAppService };
export default whatsappService;

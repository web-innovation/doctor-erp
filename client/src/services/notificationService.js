import api from './api';

const notificationService = {
  // ==========================================
  // Email Configuration
  // ==========================================

  /**
   * Get current email configuration (masked)
   */
  getEmailConfig: async () => {
    const response = await api.get('/notifications/email/config');
    return response.data?.data || null;
  },

  /**
   * Save email configuration (OAuth2 or SMTP)
   * @param {Object} config - Email configuration
   * @param {string} config.provider - 'gmail', 'outlook', or 'smtp'
   * @param {string} config.userEmail - Email address to send from
   * @param {string} [config.fromName] - Display name for sent emails
   * 
   * Gmail OAuth2:
   * @param {string} config.clientId - Google OAuth2 Client ID
   * @param {string} config.clientSecret - Google OAuth2 Client Secret
   * @param {string} config.refreshToken - Google OAuth2 Refresh Token
   * 
   * Outlook OAuth2:
   * @param {string} config.clientId - Azure AD Client ID
   * @param {string} config.clientSecret - Azure AD Client Secret
   * @param {string} config.refreshToken - Azure AD Refresh Token
   * @param {string} config.tenantId - Azure AD Tenant ID
   * 
   * SMTP:
   * @param {string} config.host - SMTP host
   * @param {number} config.port - SMTP port
   * @param {string} config.user - SMTP username
   * @param {string} config.password - SMTP password
   * @param {boolean} config.secure - Use TLS
   */
  saveEmailConfig: async (config) => {
    const response = await api.post('/notifications/email/config', config);
    return response.data;
  },

  /**
   * Test email configuration by sending a test email
   */
  testEmailConfig: async () => {
    const response = await api.post('/notifications/email/test');
    return response.data;
  },

  // ==========================================
  // Send Notifications
  // ==========================================

  /**
   * Send appointment reminder email
   * @param {number} appointmentId - Appointment ID
   */
  sendAppointmentReminder: async (appointmentId) => {
    const response = await api.post(`/notifications/appointment-reminder/${appointmentId}`);
    return response.data;
  },

  /**
   * Send prescription via email
   * @param {number} prescriptionId - Prescription ID
   */
  sendPrescriptionEmail: async (prescriptionId) => {
    const response = await api.post(`/notifications/prescription/${prescriptionId}`);
    return response.data;
  },

  /**
   * Send bill/invoice via email
   * @param {number} billId - Bill ID
   */
  sendBillEmail: async (billId) => {
    const response = await api.post(`/notifications/bill/${billId}`);
    return response.data;
  },

  /**
   * Send bulk appointment reminders
   * @param {number} hours - Hours before appointment to send reminder (default: 24)
   */
  sendBulkReminders: async (hours = 24) => {
    const response = await api.post('/notifications/bulk-reminders', { hours });
    return response.data;
  },

  // ==========================================
  // Email Logs
  // ==========================================

  /**
   * Get email notification logs
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=20] - Items per page
   * @param {string} [params.type] - Filter by notification type
   * @param {string} [params.status] - Filter by status (sent, failed)
   */
  getEmailLogs: async (params = {}) => {
    const response = await api.get('/notifications/email/logs', { params });
    return response.data?.data || { logs: [], pagination: {} };
  },

  // ==========================================
  // WhatsApp Configuration
  // ==========================================

  /**
   * Get current WhatsApp configuration (masked)
   */
  getWhatsAppConfig: async () => {
    const response = await api.get('/notifications/whatsapp/config');
    return response.data?.data || null;
  },

  /**
   * Save WhatsApp configuration
   * @param {Object} config - WhatsApp configuration
   * @param {string} config.provider - 'manual', 'twilio', or 'whatsapp-business'
   * @param {string} config.clinicWhatsAppNumber - Clinic's WhatsApp phone number
   * @param {string} [config.clinicWhatsAppName] - Clinic's WhatsApp business name
   * 
   * Twilio:
   * @param {string} config.twilioAccountSid - Twilio Account SID
   * @param {string} config.twilioAuthToken - Twilio Auth Token
   * @param {string} config.twilioWhatsAppNumber - Twilio WhatsApp Number
   * 
   * WhatsApp Business API:
   * @param {string} config.wabAccessToken - Access Token
   * @param {string} config.wabPhoneNumberId - Phone Number ID
   * @param {string} [config.wabBusinessId] - Business Account ID
   */
  saveWhatsAppConfig: async (config) => {
    const response = await api.post('/notifications/whatsapp/config', config);
    return response.data;
  },

  /**
   * Test WhatsApp configuration by sending a test message
   * @param {string} phoneNumber - Phone number to send test to
   */
  testWhatsAppConfig: async (phoneNumber) => {
    const response = await api.post('/notifications/whatsapp/test', { phoneNumber });
    return response.data;
  },
};

export default notificationService;

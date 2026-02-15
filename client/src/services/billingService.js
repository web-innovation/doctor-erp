import api from './api';

const billingService = {
  /**
   * Get list of bills with search and pagination
   * @param {Object} params - Query parameters
   * @param {string} [params.search] - Search term for invoice number or patient name
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.status] - Filter by status (pending, partial, paid, cancelled)
   * @param {string} [params.patientId] - Filter by patient
   * @param {string} [params.startDate] - Filter from date
   * @param {string} [params.endDate] - Filter to date
   * @param {string} [params.sortBy] - Sort field
   * @param {string} [params.sortOrder] - Sort order (asc/desc)
   * @returns {Promise} - Paginated bill list
   */
  getBills: async (params = {}) => {
    const response = await api.get('/billing', { params });
    return response.data;
  },

  /**
   * Get single bill by ID
   * @param {string} id - Bill ID
   * @returns {Promise} - Bill data with items and payments
   */
  getBill: async (id) => {
    const response = await api.get(`/billing/${id}`);
    return response.data;
  },

  /**
   * Create new bill
   * @param {Object} data - Bill data
   * @param {string} data.patientId - Patient ID
   * @param {Array} data.items - Bill items
   * @param {string} data.items[].description - Item description
   * @param {number} data.items[].quantity - Item quantity
   * @param {number} data.items[].unitPrice - Unit price
   * @param {string} [data.items[].type] - Item type (consultation, procedure, medicine, lab, other)
   * @param {number} [data.discount] - Discount amount
   * @param {string} [data.discountType] - Discount type (percentage, fixed)
   * @param {number} [data.tax] - Tax percentage
   * @param {string} [data.notes] - Bill notes
   * @param {string} [data.dueDate] - Payment due date
   * @returns {Promise} - Created bill data
   */
  createBill: async (data) => {
    const response = await api.post('/billing', data);
    return response.data;
  },

  /**
   * Record payment for a bill
   * @param {string} id - Bill ID
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.method - Payment method (cash, card, upi, insurance, other)
   * @param {string} [paymentData.reference] - Payment reference/transaction ID
   * @param {string} [paymentData.notes] - Payment notes
   * @param {string} [paymentData.date] - Payment date (defaults to now)
   * @returns {Promise} - Updated bill with payment recorded
   */
  recordPayment: async (id, paymentData) => {
    // Convert payment method to uppercase for backend
    const data = {
      ...paymentData,
      method: paymentData.method?.toUpperCase() || 'CASH'
    };
    const response = await api.post(`/billing/${id}/payment`, data);
    return response.data;
  },

  /**
   * Get billing summary for a period
   * @param {string} period - Period type (today, week, month, year, custom)
   * @param {Object} [options] - Additional options
   * @param {string} [options.startDate] - Start date for custom period
   * @param {string} [options.endDate] - End date for custom period
   * @returns {Promise} - Summary with totals, pending amounts, collections
   */
  getSummary: async (period, options = {}) => {
    const params = { period, ...options };
    const response = await api.get('/billing/summary', { params });
    return response.data;
  },
  /**
   * Search patients for billing (clinic-wide)
   */
  getPatients: async (params = {}) => {
    const response = await api.get('/billing/patients', { params });
    return response.data;
  },

  /**
   * Get clinic doctors for billing dropdown
   */
  getDoctors: async () => {
    const response = await api.get('/billing/doctors');
    return response.data;
  },
};

export { billingService };
export default billingService;

import api from './api';

const reportService = {
  /**
   * Get sales report
   * @param {Object} params - Report parameters
   * @param {string} params.startDate - Start date
   * @param {string} params.endDate - End date
   * @param {string} [params.groupBy] - Group by (day, week, month)
   * @param {string} [params.category] - Filter by category
   * @param {string} [params.paymentMethod] - Filter by payment method
   * @returns {Promise} - Sales report data with totals and breakdown
   */
  getSalesReport: async (params = {}) => {
    const response = await api.get('/reports/sales', { params });
    return response.data;
  },

  /**
   * Get OPD (Outpatient Department) report
   * @param {Object} params - Report parameters
   * @param {string} params.startDate - Start date
   * @param {string} params.endDate - End date
   * @param {string} [params.groupBy] - Group by (day, week, month)
   * @param {string} [params.doctorId] - Filter by doctor
   * @param {string} [params.status] - Filter by appointment status
   * @returns {Promise} - OPD report with patient visits, consultations, etc.
   */
  getOPDReport: async (params = {}) => {
    const response = await api.get('/reports/opd', { params });
    return response.data;
  },

  /**
   * Get patient report
   * @param {Object} params - Report parameters
   * @param {string} params.startDate - Start date
   * @param {string} params.endDate - End date
   * @param {string} [params.groupBy] - Group by (day, week, month)
   * @param {string} [params.gender] - Filter by gender
   * @param {string} [params.ageGroup] - Filter by age group
   * @returns {Promise} - Patient report with registrations, demographics, etc.
   */
  getPatientReport: async (params = {}) => {
    const response = await api.get('/reports/patients', { params });
    return response.data;
  },

  /**
   * Get pharmacy report
   * @param {Object} params - Report parameters
   * @param {string} params.startDate - Start date
   * @param {string} params.endDate - End date
   * @param {string} [params.groupBy] - Group by (day, week, month)
   * @param {string} [params.category] - Filter by product category
   * @param {string} [params.type] - Filter by product type
   * @returns {Promise} - Pharmacy report with sales, stock movement, etc.
   */
  getPharmacyReport: async (params = {}) => {
    const response = await api.get('/reports/pharmacy', { params });
    return response.data;
  },

  /**
   * Get commission report
   * @param {Object} params - Report parameters
   * @param {string} params.startDate - Start date
   * @param {string} params.endDate - End date
   * @param {string} [params.groupBy] - Group by (day, week, month)
   * @param {string} [params.doctorId] - Filter by doctor
   * @param {string} [params.referrerId] - Filter by referrer
   * @returns {Promise} - Commission report with earnings breakdown
   */
  getCommissionReport: async (params = {}) => {
    const response = await api.get('/reports/commissions', { params });
    return response.data;
  },
};

export { reportService };
export default reportService;

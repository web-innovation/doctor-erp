import api from './api';

const prescriptionService = {
  /**
   * Get list of prescriptions with search and pagination
   * @param {Object} params - Query parameters
   * @param {string} [params.search] - Search term for patient name or ID
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.patientId] - Filter by patient ID
   * @param {string} [params.doctorId] - Filter by doctor ID
   * @param {string} [params.startDate] - Filter from date
   * @param {string} [params.endDate] - Filter to date
   * @param {string} [params.sortBy] - Sort field
   * @param {string} [params.sortOrder] - Sort order (asc/desc)
   * @returns {Promise} - Paginated prescription list
   */
  getPrescriptions: async (params = {}) => {
    const response = await api.get('/prescriptions', { params });
    return response.data;
  },

  /**
   * Get single prescription by ID
   * @param {string} id - Prescription ID
   * @returns {Promise} - Prescription data with patient, doctor, medicines, and lab tests
   */
  getPrescription: async (id) => {
    const response = await api.get(`/prescriptions/${id}`);
    return response.data;
  },

  /**
   * Create new prescription
   * @param {Object} data - Prescription data
   * @param {string} data.patientId - Patient ID
   * @param {string} [data.doctorId] - Doctor ID (defaults to logged-in doctor)
   * @param {Object} [data.vitals] - Patient vitals
   * @param {string} [data.diagnosis] - Diagnosis
   * @param {string} [data.notes] - Additional notes
   * @param {Array} [data.medicines] - Array of prescribed medicines
   * @param {Array} [data.labTests] - Array of lab tests
   * @returns {Promise} - Created prescription data
   */
  createPrescription: async (data) => {
    const response = await api.post('/prescriptions', data);
    return response.data;
  },

  /**
   * Update prescription
   * @param {string} id - Prescription ID
   * @param {Object} data - Prescription data to update
   * @returns {Promise} - Updated prescription data
   */
  updatePrescription: async (id, data) => {
    const response = await api.put(`/prescriptions/${id}`, data);
    return response.data;
  },

  /**
   * Delete prescription
   * @param {string} id - Prescription ID
   * @returns {Promise} - Deletion confirmation
   */
  deletePrescription: async (id) => {
    const response = await api.delete(`/prescriptions/${id}`);
    return response.data;
  },

  /**
   * Send prescription via WhatsApp/Email
   * @param {string} id - Prescription ID
   * @param {string} method - 'whatsapp' or 'email'
   * @returns {Promise} - Send confirmation
   */
  sendPrescription: async (id, method) => {
    const response = await api.post(`/prescriptions/${id}/send`, { method });
    return response.data;
  },

  /**
   * Get prescription PDF
   * @param {string} id - Prescription ID
   * @returns {Promise} - PDF blob data
   */
  getPrescriptionPdf: async (id) => {
    const response = await api.get(`/prescriptions/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Search lab tests
   * @param {string} query - Search term
   * @returns {Promise} - List of matching lab tests
   */
  searchLabTests: async (query) => {
    const response = await api.get('/prescriptions/lab-tests/search', { params: { q: query } });
    return response.data;
  },

  /**
   * Search medicines from clinic pharmacy catalog for prescription
   * @param {string} query - Search term
   * @param {number} [limit=20] - Max results
   * @returns {Promise}
   */
  searchMedicines: async (query, limit = 20) => {
    const response = await api.get('/prescriptions/medicines/search', { params: { q: query, limit } });
    return response.data;
  },

  /**
   * Get prescriptions for a specific patient
   * @param {string} patientId - Patient ID
   * @param {Object} [params] - Additional query parameters
   * @returns {Promise} - Patient's prescriptions
   */
  getByPatientId: async (patientId, params = {}) => {
    const response = await api.get('/prescriptions', { params: { patientId, ...params } });
    return response.data?.data || response.data;
  },
};

export { prescriptionService };
export default prescriptionService;

import api from './api';

const patientService = {
  /**
   * Get list of patients with search and pagination
   * @param {Object} params - Query parameters
   * @param {string} [params.search] - Search term for name, phone, or email
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.sortBy] - Sort field
   * @param {string} [params.sortOrder] - Sort order (asc/desc)
   * @param {string} [params.gender] - Filter by gender
   * @param {string} [params.bloodGroup] - Filter by blood group
   * @returns {Promise} - Paginated patient list
   */
  getPatients: async (params = {}) => {
    const response = await api.get('/patients', { params });
    return response.data;
  },

  /**
   * Get single patient by ID
   * @param {string} id - Patient ID
   * @returns {Promise} - Patient data
   */
  getPatient: async (id) => {
    const response = await api.get(`/patients/${id}`);
    const payload = response.data?.data || response.data;
    // Normalize server response: parse allergies and medicalHistory if strings
    if (payload) {
      const parsed = {
        ...payload,
        allergies: typeof payload.allergies === 'string' ? JSON.parse(payload.allergies) : (payload.allergies || []),
        medicalHistory: typeof payload.medicalHistory === 'string' ? JSON.parse(payload.medicalHistory) : (payload.medicalHistory || []),
        // ensure dateOfBirth exists (server uses dateOfBirth)
        dateOfBirth: payload.dateOfBirth || null,
        insurance: payload.insurance || null,
      };
      return parsed;
    }
    return payload;
  },

  /**
   * Create new patient
   * @param {Object} data - Patient data
   * @param {string} data.name - Patient name
   * @param {string} [data.email] - Patient email
   * @param {string} data.phone - Patient phone
   * @param {string} [data.dateOfBirth] - Date of birth
   * @param {string} [data.gender] - Gender
   * @param {string} [data.bloodGroup] - Blood group
   * @param {string} [data.address] - Address
   * @param {string} [data.emergencyContact] - Emergency contact info
   * @param {string} [data.allergies] - Known allergies
   * @param {string} [data.medicalHistory] - Medical history notes
   * @returns {Promise} - Created patient data
   */
  createPatient: async (data) => {
    const response = await api.post('/patients', data);
    return response.data;
  },

  /**
   * Update patient
   * @param {string} id - Patient ID
   * @param {Object} data - Patient data to update
   * @returns {Promise} - Updated patient data
   */
  updatePatient: async (id, data) => {
    const response = await api.put(`/patients/${id}`, data);
    return response.data;
  },

  /**
   * Delete patient
   * @param {string} id - Patient ID
   * @returns {Promise} - Deletion confirmation
   */
  deletePatient: async (id) => {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
  },

  /**
   * Add vitals record for patient
   * @param {string} id - Patient ID
   * @param {Object} vitals - Vitals data
   * @param {number} [vitals.bloodPressureSystolic] - Systolic blood pressure
   * @param {number} [vitals.bloodPressureDiastolic] - Diastolic blood pressure
   * @param {number} [vitals.heartRate] - Heart rate (bpm)
   * @param {number} [vitals.temperature] - Body temperature
   * @param {number} [vitals.weight] - Weight (kg)
   * @param {number} [vitals.height] - Height (cm)
   * @param {number} [vitals.oxygenSaturation] - SpO2 level
   * @param {string} [vitals.notes] - Additional notes
   * @returns {Promise} - Created vitals record
   */
  addVitals: async (id, vitals) => {
    const response = await api.post(`/patients/${id}/vitals`, vitals);
    return response.data;
  },

  /**
   * Get patient medical history
   * @param {string} id - Patient ID
   * @param {Object} [params] - Query parameters
   * @param {number} [params.page] - Page number
   * @param {number} [params.limit] - Items per page
   * @returns {Promise} - Patient history including visits, prescriptions, etc.
   */
  getHistory: async (id, params = {}) => {
    const response = await api.get(`/patients/${id}/history`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Get patient vitals history
   * @param {string} id - Patient ID
   * @param {Object} [params] - Query parameters
   * @returns {Promise} - Patient vitals records
   */
  getVitals: async (id, params = {}) => {
    const response = await api.get(`/patients/${id}/vitals`, { params });
    return response.data?.data || response.data;
  },

  /**
   * Get patient bills
   * @param {string} id - Patient ID
   * @param {Object} [params] - Query parameters
   * @returns {Promise} - Patient bills
   */
  getBills: async (id, params = {}) => {
    const response = await api.get(`/patients/${id}/bills`, { params });
    return response.data?.data || response.data;
  },

  getDocuments: async (id) => {
    const response = await api.get(`/patients/${id}/documents`);
    return response.data?.data || response.data;
  },

  uploadDocument: async (id, payload) => {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.title) formData.append('title', payload.title);
    if (payload.category) formData.append('category', payload.category);
    if (payload.notes) formData.append('notes', payload.notes);
    const response = await api.post(`/patients/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Get recent patients
   * @param {number} [limit=5] - Number of patients to fetch
   * @returns {Promise} - Recent patients array
   */
  getRecent: async (limit = 5) => {
    const response = await api.get('/patients', { params: { limit, sortBy: 'createdAt', sortOrder: 'desc' } });
    return response.data?.data || [];
  },
};

// Alias for backward compatibility
patientService.getAll = patientService.getPatients;
patientService.getById = patientService.getPatient;

export { patientService };
export default patientService;

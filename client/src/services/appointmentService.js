import api from './api';

const appointmentService = {
  /**
   * Get list of appointments with filters
   * @param {Object} params - Query parameters
   * @param {string} [params.search] - Search term
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.status] - Filter by status (scheduled, confirmed, completed, cancelled, no-show)
   * @param {string} [params.date] - Filter by specific date
   * @param {string} [params.startDate] - Filter from date
   * @param {string} [params.endDate] - Filter to date
   * @param {string} [params.doctorId] - Filter by doctor
   * @param {string} [params.patientId] - Filter by patient
   * @param {string} [params.type] - Filter by appointment type
   * @returns {Promise} - Paginated appointment list
   */
  getAppointments: async (params = {}) => {
    const response = await api.get('/appointments', { params });
    return response.data;
  },

  /**
   * Get single appointment by ID
   * @param {string} id - Appointment ID
   * @returns {Promise} - Appointment data with patient and doctor details
   */
  getAppointment: async (id) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  /**
   * Create new appointment
   * @param {Object} data - Appointment data
   * @param {string} data.patientId - Patient ID
   * @param {string} data.doctorId - Doctor ID
   * @param {string} data.date - Appointment date
   * @param {string} data.time - Appointment time
   * @param {string} [data.type] - Appointment type (consultation, follow-up, procedure)
   * @param {string} [data.reason] - Reason for visit
   * @param {string} [data.notes] - Additional notes
   * @param {number} [data.duration] - Duration in minutes
   * @returns {Promise} - Created appointment data
   */
  createAppointment: async (data) => {
    const response = await api.post('/appointments', data);
    return response.data;
  },

  /**
   * Update appointment
   * @param {string} id - Appointment ID
   * @param {Object} data - Appointment data to update
   * @returns {Promise} - Updated appointment data
   */
  updateAppointment: async (id, data) => {
    const response = await api.put(`/appointments/${id}`, data);
    return response.data;
  },

  /**
   * Update appointment status
   * @param {string} id - Appointment ID
   * @param {string} status - New status (scheduled, confirmed, completed, cancelled, no-show)
   * @param {string} [reason] - Reason for status change (especially for cancellation)
   * @returns {Promise} - Updated appointment data
   */
  updateStatus: async (id, status, reason = null) => {
    const response = await api.put(`/appointments/${id}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  /**
   * Get today's appointment count
   * @returns {Promise} - Object with count statistics
   */
  getTodayCount: async () => {
    const response = await api.get('/appointments/today/count');
    return response.data;
  },

  /**
   * Get calendar data for a month
   * @param {number} month - Month (1-12)
   * @param {number} year - Year (e.g., 2024)
   * @param {string} [doctorId] - Optional doctor filter
   * @returns {Promise} - Calendar data with appointments per day
   */
  getCalendarData: async (month, year, doctorId = null) => {
    const params = { month, year };
    if (doctorId) {
      params.doctorId = doctorId;
    }
    const response = await api.get('/appointments/calendar', { params });
    return response.data;
  },

  /**
   * Get today's appointments list
   * @returns {Promise} - Today's appointments array
   */
  getTodayAppointments: async () => {
    const today = new Date().toISOString().split('T')[0];
    const response = await api.get('/appointments', { 
      params: { startDate: today, endDate: today, limit: 50 } 
    });
    return response.data?.data || [];
  },

  /**
   * Get active clinic doctors for dropdowns
   * @returns {Promise} - Array of doctors {id, name, email}
   */
  getDoctors: async () => {
    const response = await api.get('/appointments/doctors');
    return response.data;
  },
};

export { appointmentService };
export default appointmentService;

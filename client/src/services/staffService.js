import api from './api';

const staffService = {
  // Staff CRUD operations
  getAll: async (params = {}) => {
    const response = await api.get('/staff', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/staff', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data;
  },

  deactivate: async (id) => {
    const response = await api.patch(`/staff/${id}/deactivate`);
    return response.data;
  },

  activate: async (id) => {
    const response = await api.patch(`/staff/${id}/activate`);
    return response.data;
  },

  // Attendance operations
  getAttendance: async (params = {}) => {
    const response = await api.get('/staff/attendance', { params });
    return response.data;
  },

  markAttendance: async (data) => {
    const response = await api.post('/staff/attendance', data);
    return response.data;
  },

  updateAttendance: async (id, data) => {
    const response = await api.put(`/staff/attendance/${id}`, data);
    return response.data;
  },

  getAttendanceSummary: async (params = {}) => {
    const response = await api.get('/staff/attendance/summary', { params });
    return response.data;
  },

  // Leave operations
  getLeaves: async (params = {}) => {
    const response = await api.get('/staff/leaves', { params });
    return response.data;
  },

  applyLeave: async (data) => {
    const response = await api.post('/staff/leaves', data);
    return response.data;
  },

  updateLeaveStatus: async (id, data) => {
    const response = await api.put(`/staff/leaves/${id}`, data);
    return response.data;
  },

  // Departments
  getDepartments: async () => {
    const response = await api.get('/staff/departments');
    return response.data;
  },

  // Designations
  getDesignations: async () => {
    const response = await api.get('/staff/designations');
    return response.data;
  },
};

export { staffService };
export default staffService;

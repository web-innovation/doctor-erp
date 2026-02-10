import api from './api';

const adminService = {
  // Dashboard
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    // Backend returns { success: true, data: { stats: {...}, monthlyGrowth: [...], recentClinics: [...] } }
    const result = response.data?.data || {};
    return {
      totalClinics: result.stats?.totalClinics || 0,
      activeClinics: result.stats?.activeClinics || 0,
      inactiveClinics: result.stats?.inactiveClinics || 0,
      totalUsers: result.stats?.totalUsers || 0,
      totalPatients: result.stats?.totalPatients || 0,
      activeUsers: result.stats?.activeUsers || 0,
      todayAppointments: result.stats?.todayAppointments || 0,
      monthlyRevenue: result.stats?.monthlyRevenue || 0,
      lastMonthRevenue: result.stats?.lastMonthRevenue || 0,
      newClinicsThisMonth: result.stats?.newClinicsThisMonth || 0,
      newClinicsLastMonth: result.stats?.newClinicsLastMonth || 0,
      newUsersThisMonth: result.stats?.newUsersThisMonth || 0,
      newPatientsThisMonth: result.stats?.newPatientsThisMonth || 0,
      monthlyGrowth: result.monthlyGrowth || [],
      recentClinics: result.recentClinics || []
    };
  },

  // Clinics
  getClinics: async (params = {}) => {
    const response = await api.get('/admin/clinics', { params });
    // Backend returns { success: true, data: [...], pagination: {...} }
    return {
      clinics: response.data?.data || [],
      total: response.data?.pagination?.total || 0,
      page: response.data?.pagination?.page || 1,
      totalPages: response.data?.pagination?.totalPages || 1
    };
  },

  getClinic: async (id) => {
    const response = await api.get(`/admin/clinics/${id}`);
    // Backend returns { success: true, data: {...} }
    return response.data?.data || null;
  },

  createClinic: async (data) => {
    const response = await api.post('/admin/clinics', data);
    return response.data;
  },

  updateClinic: async (id, data) => {
    const response = await api.put(`/admin/clinics/${id}`, data);
    return response.data;
  },

  deleteClinic: async (id) => {
    const response = await api.delete(`/admin/clinics/${id}`);
    return response.data;
  },

  activateClinic: async (id) => {
    const response = await api.post(`/admin/clinics/${id}/activate`);
    return response.data;
  },

  blockClinic: async (id) => {
    const response = await api.post(`/admin/clinics/${id}/block`);
    return response.data;
  },

  unblockClinic: async (id) => {
    const response = await api.post(`/admin/clinics/${id}/unblock`);
    return response.data;
  },

  // Staff Management
  addStaffToClinic: async (clinicId, data) => {
    const response = await api.post(`/admin/clinics/${clinicId}/staff`, data);
    return response.data;
  },

  removeStaffFromClinic: async (clinicId, userId) => {
    const response = await api.delete(`/admin/clinics/${clinicId}/staff/${userId}`);
    return response.data;
  },

  // Users
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    // Backend returns { success: true, data: [...], pagination: {...} }
    return {
      users: response.data?.data || [],
      total: response.data?.pagination?.total || 0,
      page: response.data?.pagination?.page || 1,
      totalPages: response.data?.pagination?.totalPages || 1
    };
  },

  toggleUserStatus: async (id) => {
    const response = await api.post(`/admin/users/${id}/toggle-status`);
    return response.data;
  },

  resetUserPassword: async (id, newPassword) => {
    const response = await api.post(`/admin/users/${id}/reset-password`, { newPassword });
    return response.data;
  },
};

export { adminService };
export default adminService;

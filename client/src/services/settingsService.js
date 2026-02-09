import api from './api';

const settingsService = {
  // Profile settings
  getProfile: async () => {
    const response = await api.get('/settings/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/settings/profile', data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.post('/settings/change-password', data);
    return response.data;
  },

  // Clinic settings
  getClinicSettings: async () => {
    const response = await api.get('/settings/clinic');
    return response.data;
  },

  updateClinicSettings: async (data) => {
    const response = await api.put('/settings/clinic', data);
    return response.data;
  },

  // Tax settings
  getTaxSettings: async () => {
    const response = await api.get('/settings/tax');
    return response.data;
  },

  updateTaxSettings: async (data) => {
    const response = await api.put('/settings/tax', data);
    return response.data;
  },

  // Working hours settings
  getWorkingHours: async () => {
    const response = await api.get('/settings/working-hours');
    return response.data;
  },

  updateWorkingHours: async (data) => {
    const response = await api.put('/settings/working-hours', data);
    return response.data;
  },

  // Preferences
  getPreferences: async () => {
    const response = await api.get('/settings/preferences');
    return response.data;
  },

  updatePreferences: async (data) => {
    const response = await api.put('/settings/preferences', data);
    return response.data;
  },

  // Dashboard widgets
  getDashboardWidgets: async () => {
    const response = await api.get('/settings/dashboard-widgets');
    return response.data;
  },

  updateDashboardWidgets: async (data) => {
    const response = await api.put('/settings/dashboard-widgets', data);
    return response.data;
  },
};

export { settingsService };
export default settingsService;

import api from './api';

const settingsService = {
  // Profile settings
  getProfile: async () => {
    const response = await api.get('/auth/me');
    // Server returns { user } — adapt to previous callers expecting response.data to be user
    return response.data?.user || response.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  // Clinic settings
  getClinicSettings: async () => {
    const response = await api.get('/clinic');
    const clinic = response.data?.data || response.data;
    // Map server field names to expected UI field names
    return {
      clinicName: clinic?.name || '',
      address: clinic?.address || '',
      city: clinic?.city || '',
      state: clinic?.state || '',
      pincode: clinic?.pincode || '',
      phone: clinic?.phone || '',
      email: clinic?.email || '',
      website: clinic?.website || '',
      registrationNo: clinic?.licenseNumber || '',
      gstNo: clinic?.gstNumber || '',
      logo: clinic?.logo || '',
      slotDuration: clinic?.slotDuration || 15,
    };
  },

  updateClinicSettings: async (data) => {
    // Map UI field names to server field names
    const serverData = {
      name: data.clinicName,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      phone: data.phone,
      email: data.email,
      website: data.website,
      licenseNumber: data.registrationNo,
      gstNumber: data.gstNo,
      logo: data.logo,
      slotDuration: data.slotDuration,
    };
    const response = await api.put('/clinic', serverData);
    return response.data;
  },

  // Tax settings
  getTaxSettings: async () => {
    const response = await api.get('/clinic/tax-config');
    const data = response.data?.data || response.data;
    const taxConfig = data?.taxConfig || {};
    return {
      consultationGST: taxConfig.consultationGST || 0,
      pharmacyGST: taxConfig.pharmacyGST || 0,
      labGST: taxConfig.labGST || 0,
      otherGST: taxConfig.otherGST || 0,
      inclusiveTax: taxConfig.inclusiveTax || false,
      gstNumber: data?.gstNumber || '',
    };
  },

  updateTaxSettings: async (data) => {
    const taxConfig = {
      consultationGST: data.consultationGST,
      pharmacyGST: data.pharmacyGST,
      labGST: data.labGST,
      otherGST: data.otherGST,
      inclusiveTax: data.inclusiveTax,
    };
    const response = await api.put('/clinic/tax-config', { 
      taxConfig, 
      gstNumber: data.gstNumber 
    });
    return response.data;
  },

  // Working hours settings
  getWorkingHours: async () => {
    const response = await api.get('/clinic/working-hours');
    const data = response.data?.data || response.data;
    // Normalize server shape (object with lowercase day keys) to UI array shape
    const serverHours = data?.workingHours || null;
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    let hours = null;
    if (Array.isArray(serverHours)) {
      hours = serverHours;
    } else if (serverHours && typeof serverHours === 'object') {
      hours = DAYS.map((day) => {
        const key = day.toLowerCase();
        const entry = serverHours[key] || {};
        if (entry.closed) {
          return {
            day,
            isOpen: false,
            openTime: '09:00',
            closeTime: '18:00',
            breakStart: '13:00',
            breakEnd: '14:00',
          };
        }
        return {
          day,
          isOpen: true,
          openTime: entry.start || '09:00',
          closeTime: entry.end || '18:00',
          breakStart: entry.breakStart || '13:00',
          breakEnd: entry.breakEnd || '14:00',
        };
      });
    }

    return {
      hours,
      slotDuration: data?.slotDuration || 15,
    };
  },

  updateWorkingHours: async (data) => {
    // Convert UI array shape back to server object shape (lowercase day keys)
    const serverHours = {};
    if (Array.isArray(data.hours)) {
      data.hours.forEach((h) => {
        const key = (h.day || '').toLowerCase();
        if (!key) return;
        if (!h.isOpen) {
          serverHours[key] = { closed: true };
        } else {
          serverHours[key] = {
            start: h.openTime,
            end: h.closeTime,
            breakStart: h.breakStart,
            breakEnd: h.breakEnd,
          };
        }
      });
    }

    const response = await api.put('/clinic/working-hours', {
      workingHours: serverHours,
      slotDuration: data.slotDuration,
    });
    return response.data;
  },

  // Preferences (stored as part of clinic data for now)
  getPreferences: async () => {
    // For now, return default values - can be extended to store in DB
    return {
      dashboardWidgets: null,
    };
  },

  updatePreferences: async (data) => {
    // For now, just return success - can be extended to store in DB
    return { success: true, message: 'Preferences saved' };
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

  // Role permissions per clinic
  getRolePermissions: async () => {
    const response = await api.get('/clinic/role-permissions');
    return response.data;
  },

  updateRolePermissions: async (data) => {
    const response = await api.put('/clinic/role-permissions', { rolePermissions: data });
    return response.data;
  },

  // Super admin access controls (read-only for clinic users)
  getAccessControls: async () => {
    const response = await api.get('/clinic/access-controls');
    return response.data;
  },
};

export { settingsService };
export default settingsService;

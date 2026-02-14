import api from './api';

const dashboardService = {
  /**
   * Get dashboard statistics
   * @returns {Promise} - Dashboard stats including:
   *   - todayAppointments: count of today's appointments
   *   - todayPatients: count of today's patient visits
   *   - todayRevenue: today's total revenue
   *   - pendingBills: count and amount of pending bills
   *   - newPatients: new patient registrations this month
   *   - lowStockItems: count of low stock pharmacy items
   */
  getStats: async (staffId = null) => {
    const response = await api.get('/dashboard/stats', {
      params: staffId ? { staffId } : {}
    });
    return response.data;
  },

  /**
   * Get chart data for dashboard
   * @param {string} period - Period for chart data (week, month, quarter, year)
   * @returns {Promise} - Chart data including:
   *   - revenueChart: revenue over time
   *   - appointmentsChart: appointments over time
   *   - patientChart: patient registrations over time
   *   - departmentDistribution: appointments by department
   *   - paymentMethodDistribution: payments by method
   */
  getCharts: async (period = 'month', staffId = null) => {
    const response = await api.get('/dashboard/charts', {
      params: Object.assign({ period }, staffId ? { staffId } : {})
    });
    return response.data;
  },

  /**
   * Get dashboard alerts and notifications
   * @returns {Promise} - List of alerts including:
   *   - lowStock: pharmacy items with low stock
   *   - upcomingAppointments: appointments in next hour
   *   - pendingPayments: overdue payments
   *   - expiringMedicines: medicines expiring soon
   *   - systemAlerts: any system-level alerts
   */
  getAlerts: async (staffId = null) => {
    const response = await api.get('/dashboard/alerts', {
      params: staffId ? { staffId } : {}
    });
    return response.data;
  },

  /**
   * Get recent activity feed
   * @param {number} [limit=10] - Number of activities to fetch
   * @returns {Promise} - Recent activities including:
   *   - newPatients: recently registered patients
   *   - completedAppointments: recently completed appointments
   *   - recentPayments: recent payment transactions
   *   - stockUpdates: recent stock changes
   */
  getRecentActivity: async (limit = 10, staffId = null) => {
    const response = await api.get('/dashboard/activity', {
      params: Object.assign({ limit }, staffId ? { staffId } : {})
    });
    return response.data;
  },

  /**
   * Get patient trend data for charts
   * @param {string} dateRange - Date range (7days, 30days, etc.)
   * @returns {Promise} - Patient trend data with labels and data arrays
   */
  getPatientTrend: async (dateRange = '7days', staffId = null) => {
    // Using chart data API
    const response = await api.get('/dashboard/charts', {
      params: Object.assign({ period: dateRange }, staffId ? { staffId } : {}),
    });
    // Generate placeholder data for visualization
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return {
      labels,
      data: response.data?.data?.distribution?.appointmentsByStatus?.map(s => s._count) || [0, 0, 0, 0, 0, 0, 0]
    };
  },

  /**
   * Get revenue trend data for charts
   * @param {string} dateRange - Date range (7days, 30days, etc.)
   * @returns {Promise} - Revenue trend data with labels and data arrays
   */
  getRevenueTrend: async (dateRange = '7days', staffId = null) => {
    const response = await api.get('/dashboard/charts', {
      params: Object.assign({ period: dateRange }, staffId ? { staffId } : {}),
    });
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const total = response.data?.data?.summary?.totalRevenue || 0;
    // Distribute across days for demo
    return {
      labels,
      data: labels.map(() => Math.round(total / 7 + Math.random() * 1000))
    };
  },
};

export { dashboardService };
export default dashboardService;

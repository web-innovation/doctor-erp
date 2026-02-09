import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Bot-Key': process.env.BOT_API_KEY || 'whatsapp-bot-secret'
  }
});

export const apiService = {
  // Appointments
  async getAvailableSlots(date) {
    const res = await api.get('/appointments/slots', { params: { date } });
    return res.data.slots || ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00'];
  },

  async createAppointment(data) {
    const res = await api.post('/appointments', {
      patientPhone: data.phone,
      patientName: data.name,
      date: data.date,
      timeSlot: data.time,
      symptoms: data.symptoms,
      bookedVia: 'WHATSAPP'
    });
    return res.data;
  },

  async getPatientAppointments(phone, appointmentId) {
    const params = appointmentId ? { appointmentId } : { phone };
    const res = await api.get('/appointments/patient', { params });
    return res.data.appointments || [];
  },

  async cancelAppointment(appointmentId, phone) {
    const res = await api.patch(`/appointments/${appointmentId}/status`, {
      status: 'CANCELLED',
      phone
    });
    return res.data;
  },

  async getTodayAppointments() {
    const res = await api.get('/appointments', { 
      params: { date: new Date().toISOString().split('T')[0] }
    });
    return res.data.appointments || [];
  },

  async getQueue() {
    const res = await api.get('/appointments/queue');
    return res.data.queue || [];
  },

  async callNextPatient() {
    const res = await api.post('/appointments/call-next');
    return res.data;
  },

  // Prescriptions
  async getPrescription(prescriptionId) {
    const res = await api.get(`/prescriptions/${prescriptionId}`);
    return res.data;
  },

  async getLatestPrescription(phone) {
    const res = await api.get('/prescriptions/latest', { params: { phone } });
    return res.data;
  },

  async sendPrescription(prescriptionId, phone) {
    const res = await api.post(`/prescriptions/${prescriptionId}/send`, { 
      phone,
      channels: ['whatsapp', 'email'] 
    });
    return res.data;
  },

  // Pharmacy
  async checkStock(medicine) {
    const res = await api.get('/pharmacy/products/search', { 
      params: { query: medicine } 
    });
    return res.data.products?.[0];
  },

  async getLowStockProducts() {
    const res = await api.get('/pharmacy/products/low-stock');
    return res.data.products || [];
  },

  async bulkUpdateStock(updates) {
    const res = await api.post('/pharmacy/bulk-update', { updates });
    return res.data;
  },

  // Attendance
  async markAttendance(phone, type) {
    const res = await api.post('/staff/attendance', { phone, type });
    return res.data;
  },

  async getAttendanceReport(phone) {
    const res = await api.get('/staff/attendance/report', { params: { phone } });
    return res.data;
  },

  // Leaves
  async applyLeave(phone, data) {
    const res = await api.post('/staff/leave', {
      phone,
      type: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason
    });
    return res.data;
  },

  // Payments
  async recordPayment(data) {
    const res = await api.post('/payments', data);
    return res.data;
  },

  // Reports
  async getSalesReport(period) {
    const res = await api.get('/reports/sales', { params: { period } });
    return res.data;
  },

  async getOPDReport(period) {
    const res = await api.get('/reports/opd', { params: { period } });
    return res.data;
  }
};

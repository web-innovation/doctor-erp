import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import { logImpersonation } from '../middleware/hipaaAudit.js';

const router = express.Router();

// GET /stats - Today's counts (OPD, revenue, appointments)
router.get('/stats', authenticate, checkPermission('dashboard:read'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const clinicId = req.query.clinicId || req.user.clinicId;
    const staffId = req.query.staffId || null; // optional: view stats for specific staff/doctor (user id)
    const clinicFilter = clinicId ? { clinicId } : {};
    
    const [
      todayAppointments,
      yesterdayAppointments,
      todayRevenue,
      yesterdayRevenue,
      todayCollections,
      todayNewPatients,
      todayBills,
      pendingAppointments,
      completedAppointments
    ] = await Promise.all([
      prisma.appointment.count({
        where: Object.assign({}, clinicFilter, { date: { gte: today, lt: tomorrow } }, staffId ? { doctorId: staffId } : {})
      }),
      prisma.appointment.count({
        where: Object.assign({}, clinicFilter, { date: { gte: yesterday, lt: today } }, staffId ? { doctorId: staffId } : {})
      }),
      prisma.bill.aggregate({
        where: Object.assign({}, clinicFilter, { createdAt: { gte: today, lt: tomorrow } }, staffId ? { doctorId: staffId } : {}),
        _sum: { totalAmount: true }
      }),
      prisma.bill.aggregate({
        where: Object.assign({}, clinicFilter, { createdAt: { gte: yesterday, lt: today } }, staffId ? { doctorId: staffId } : {}),
        _sum: { totalAmount: true }
      }),
      prisma.payment.aggregate({
        where: Object.assign({}, clinicFilter, { createdAt: { gte: today, lt: tomorrow } }, staffId ? { staffId } : {}),
        _sum: { amount: true }
      }),
      prisma.patient.count({
        where: Object.assign({}, clinicFilter, { createdAt: { gte: today, lt: tomorrow } })
      }),
      prisma.bill.count({
        where: Object.assign({}, clinicFilter, { createdAt: { gte: today, lt: tomorrow } }, staffId ? { doctorId: staffId } : {})
      }),
      prisma.appointment.count({
        where: Object.assign({}, clinicFilter, { date: { gte: today, lt: tomorrow }, status: 'SCHEDULED' }, staffId ? { doctorId: staffId } : {})
      }),
      prisma.appointment.count({
        where: Object.assign({}, clinicFilter, { date: { gte: today, lt: tomorrow }, status: 'COMPLETED' }, staffId ? { doctorId: staffId } : {})
      })
    ]);
    
    const todayRevenueAmount = todayRevenue._sum.totalAmount || 0;
    const yesterdayRevenueAmount = yesterdayRevenue._sum.totalAmount || 0;
    
    const revenueGrowth = yesterdayRevenueAmount > 0 
      ? (((todayRevenueAmount - yesterdayRevenueAmount) / yesterdayRevenueAmount) * 100).toFixed(1)
      : todayRevenueAmount > 0 ? 100 : 0;
    
    const appointmentGrowth = yesterdayAppointments > 0 
      ? (((todayAppointments - yesterdayAppointments) / yesterdayAppointments) * 100).toFixed(1)
      : todayAppointments > 0 ? 100 : 0;
    
    res.json({
      success: true,
      data: {
        appointments: { total: todayAppointments, pending: pendingAppointments, completed: completedAppointments, growth: parseFloat(appointmentGrowth) },
        revenue: { total: todayRevenueAmount, growth: parseFloat(revenueGrowth) },
        collections: { total: todayCollections._sum.amount || 0 },
        patients: { newToday: todayNewPatients },
        bills: { count: todayBills },
        date: today.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /charts - Chart data
router.get('/charts', authenticate, checkPermission('dashboard:read'), async (req, res) => {
  try {
    const { period = '7days' } = req.query;
    const clinicId = req.query.clinicId || req.user.clinicId;
    const staffId = req.query.staffId || null;
    const clinicFilter = clinicId ? { clinicId } : {};
    const days = period === '30days' ? 30 : period === '90days' ? 90 : 7;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const [appointmentsByStatus, collectionsByMethod, billsSummary] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['status'],
        where: Object.assign({}, clinicFilter, { date: { gte: startDate } }, staffId ? { doctorId: staffId } : {}),
        _count: true
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: Object.assign({}, clinicFilter, { createdAt: { gte: startDate } }, staffId ? { staffId } : {}),
        _sum: { amount: true }
      }),
      prisma.bill.aggregate({
        where: Object.assign({}, clinicFilter, { createdAt: { gte: startDate } }, staffId ? { doctorId: staffId } : {}),
        _sum: { totalAmount: true, paidAmount: true },
        _count: true
      })
    ]);

    if (staffId && staffId !== req.user.id) {
      // Record audit that current user viewed dashboard charts as another staff
      await logImpersonation(req.user.id, staffId, { path: req.originalUrl, ipAddress: req.ip || 'unknown', userAgent: req.headers['user-agent'] });
    }
    
    res.json({
      success: true,
      data: {
        period,
        distribution: { appointmentsByStatus, collectionsByMethod },
        summary: {
          totalRevenue: billsSummary._sum.totalAmount || 0,
          totalCollected: billsSummary._sum.paidAmount || 0,
          billCount: billsSummary._count || 0
        }
      }
    });
  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /alerts - Alerts and notifications
router.get('/alerts', authenticate, checkPermission('dashboard:read'), async (req, res) => {
  try {
    const clinicId = req.query.clinicId || req.user.clinicId;
    const staffId = req.query.staffId || null;
    const clinicFilter = clinicId ? { clinicId } : {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [pendingBills, allPharmacyItems, upcomingAppointments] = await Promise.all([
      prisma.bill.count({
        where: Object.assign({}, clinicFilter, { paymentStatus: { in: ['PENDING', 'PARTIAL'] }, dueAmount: { gt: 0 } }, staffId ? { doctorId: staffId } : {})
      }),
      prisma.pharmacyProduct.findMany({
        where: Object.assign({}, clinicFilter, { isActive: true }),
        select: { id: true, name: true, quantity: true, minStock: true },
      }),
      prisma.appointment.findMany({
        where: Object.assign({}, clinicFilter, { date: { gte: today, lt: tomorrow }, status: 'SCHEDULED' }, staffId ? { doctorId: staffId } : {}),
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { timeSlot: 'asc' },
        take: 5
      })
    ]);
    if (staffId && staffId !== req.user.id) {
      await logImpersonation(req.user.id, staffId, { path: req.originalUrl, ipAddress: req.ip || 'unknown', userAgent: req.headers['user-agent'] });
    }
    
    // Filter items where quantity is strictly less than minStock
    const lowStockItems = allPharmacyItems.filter(item => item.quantity < (item.minStock || 10)).slice(0, 10);
    
    const alerts = [];
    if (pendingBills > 0) alerts.push({ type: 'warning', title: 'Pending Bills', message: `${pendingBills} bill(s) pending`, count: pendingBills });
    if (lowStockItems.length > 0) alerts.push({ type: 'danger', title: 'Low Stock', message: `${lowStockItems.length} item(s) low`, items: lowStockItems });
    
    res.json({ success: true, data: { alerts, upcomingAppointments } });
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /recent - Recent activity
router.get('/recent', authenticate, checkPermission('dashboard:read'), async (req, res) => {
  try {
    const clinicId = req.query.clinicId || req.user.clinicId;
    const limit = parseInt(req.query.limit) || 10;
    const staffId = req.query.staffId || null;
    const clinicFilter = clinicId ? { clinicId } : {};

    const [recentAppointments, recentPatients, recentBills] = await Promise.all([
      prisma.appointment.findMany({
        where: Object.assign({}, clinicFilter, staffId ? { doctorId: staffId } : {}), orderBy: { createdAt: 'desc' }, take: limit,
        include: { patient: { select: { id: true, name: true } } }
      }),
      prisma.patient.findMany({
        where: clinicFilter, orderBy: { createdAt: 'desc' }, take: limit,
        select: { id: true, patientId: true, name: true, phone: true, createdAt: true }
      }),
      prisma.bill.findMany({
        where: Object.assign({}, clinicFilter, staffId ? { doctorId: staffId } : {}), orderBy: { createdAt: 'desc' }, take: limit,
        include: { patient: { select: { id: true, name: true } } }
      })
    ]);
    if (staffId && staffId !== req.user.id) {
      await logImpersonation(req.user.id, staffId, { path: req.originalUrl, ipAddress: req.ip || 'unknown', userAgent: req.headers['user-agent'] });
    }
    
    res.json({ success: true, data: { recentAppointments, recentPatients, recentBills } });
  } catch (error) {
    console.error('Dashboard recent error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Helper to get date range
function getDateRange(period, startDate, endDate) {
  if (startDate && endDate) {
    return { gte: new Date(startDate), lte: new Date(endDate) };
  }
  const now = new Date();
  let start;
  switch (period) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      start = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      start = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'quarter':
      start = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'year':
      start = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      start = new Date(now.setMonth(now.getMonth() - 1));
  }
  return { gte: start, lte: new Date() };
}

// Helper to generate chart labels and date buckets
function generateDateBuckets(startDate, endDate, groupBy = 'day') {
  const labels = [];
  const dateKeys = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    if (groupBy === 'day') {
      labels.push(current.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
      dateKeys.push(dateKey);
      current.setDate(current.getDate() + 1);
    } else if (groupBy === 'week') {
      labels.push(`Week ${Math.ceil(current.getDate() / 7)}`);
      dateKeys.push(dateKey);
      current.setDate(current.getDate() + 7);
    } else {
      labels.push(current.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }));
      dateKeys.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
  }
  return { labels: labels.slice(0, 31), dateKeys: dateKeys.slice(0, 31) };
}

// GET /sales - Sales report
router.get('/sales', checkPermission('reports', 'sales'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate, groupBy = 'day' } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

    // Generate date buckets for chart
    const { labels, dateKeys } = generateDateBuckets(dateRange.gte, dateRange.lte, groupBy);

    // Get daily bills data for chart
    const dailyBills = await prisma.bill.findMany({
      where: { clinicId, createdAt: dateRange },
      select: { createdAt: true, totalAmount: true }
    });

    // Aggregate by date
    const revenueByDate = {};
    dateKeys.forEach(key => revenueByDate[key] = 0);
    dailyBills.forEach(bill => {
      const dateKey = groupBy === 'month' 
        ? `${bill.createdAt.getFullYear()}-${String(bill.createdAt.getMonth() + 1).padStart(2, '0')}`
        : bill.createdAt.toISOString().split('T')[0];
      if (revenueByDate[dateKey] !== undefined) {
        revenueByDate[dateKey] += bill.totalAmount || 0;
      }
    });

    const [billsSummary, billsByType, paymentsByMethod, topPatients] = await Promise.all([
      prisma.bill.aggregate({
        where: { clinicId, createdAt: dateRange },
        _sum: { totalAmount: true, paidAmount: true, dueAmount: true, taxAmount: true },
        _count: true
      }),
      prisma.bill.groupBy({
        by: ['type'],
        where: { clinicId, createdAt: dateRange },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: { clinicId, createdAt: dateRange },
        _sum: { amount: true },
        _count: true
      }),
      prisma.bill.groupBy({
        by: ['patientId'],
        where: { clinicId, createdAt: dateRange, patientId: { not: null } },
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10
      })
    ]);

    const topPatientIds = topPatients.map((p) => p.patientId).filter(Boolean);
    const topPatientRows = topPatientIds.length
      ? await prisma.patient.findMany({
          where: { id: { in: topPatientIds }, clinicId },
          select: { id: true, patientId: true, name: true, phone: true }
        })
      : [];
    const topPatientMap = new Map(topPatientRows.map((p) => [p.id, p]));
    const topPatientsDetailed = topPatients.map((row) => {
      const p = topPatientMap.get(row.patientId);
      return {
        patientId: row.patientId,
        patientCode: p?.patientId || null,
        patientName: p?.name || 'Unknown Patient',
        phone: p?.phone || null,
        totalAmount: row._sum?.totalAmount || 0,
        count: row._count || 0
      };
    });

    const totalRevenue = billsSummary._sum.totalAmount || 0;
    const totalBills = billsSummary._count || 0;
    const avgBill = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        // Summary stats for cards
        totalRevenue,
        totalTransactions: totalBills,
        avgBill,
        outstanding: billsSummary._sum.dueAmount || 0,
        totalCollected: billsSummary._sum.paidAmount || 0,
        totalTax: billsSummary._sum.taxAmount || 0,
        // Chart data
        chartData: {
          labels,
          revenue: dateKeys.map(key => revenueByDate[key] || 0)
        },
        // Breakdown data
        byType: billsByType,
        byPaymentMethod: paymentsByMethod,
        topPatients: topPatientsDetailed
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /opd - OPD report
router.get('/opd', checkPermission('reports', 'opd'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate, groupBy = 'day' } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

    // Generate date buckets for chart
    const { labels, dateKeys } = generateDateBuckets(dateRange.gte, dateRange.lte, groupBy);

    // Get daily appointments data
    const dailyAppointments = await prisma.appointment.findMany({
      where: { clinicId, date: dateRange },
      select: { date: true, status: true }
    });

    // Count new patients per day
    const dailyPatients = await prisma.patient.findMany({
      where: { clinicId, createdAt: dateRange },
      select: { createdAt: true }
    });

    // Aggregate by date
    const appointmentsByDate = {};
    const patientsByDate = {};
    dateKeys.forEach(key => {
      appointmentsByDate[key] = 0;
      patientsByDate[key] = 0;
    });

    dailyAppointments.forEach(apt => {
      const dateKey = groupBy === 'month'
        ? `${apt.date.getFullYear()}-${String(apt.date.getMonth() + 1).padStart(2, '0')}`
        : apt.date.toISOString().split('T')[0];
      if (appointmentsByDate[dateKey] !== undefined) {
        appointmentsByDate[dateKey]++;
      }
    });

    dailyPatients.forEach(p => {
      const dateKey = groupBy === 'month'
        ? `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`
        : p.createdAt.toISOString().split('T')[0];
      if (patientsByDate[dateKey] !== undefined) {
        patientsByDate[dateKey]++;
      }
    });

    const [appointmentsSummary, byStatus, byType] = await Promise.all([
      prisma.appointment.aggregate({
        where: { clinicId, date: dateRange },
        _count: true,
        _sum: { consultationFee: true }
      }),
      prisma.appointment.groupBy({
        by: ['status'],
        where: { clinicId, date: dateRange },
        _count: true
      }),
      prisma.appointment.groupBy({
        by: ['type'],
        where: { clinicId, date: dateRange },
        _count: true
      })
    ]);

    // Count new vs returning patients
    const totalPatients = await prisma.patient.count({ where: { clinicId } });
    const newPatients = dailyPatients.length;
    const completedCount = byStatus.find(s => s.status === 'COMPLETED')?._count || 0;

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        // Summary stats for cards
        totalPatients,
        totalConsultations: appointmentsSummary._count || 0,
        newPatients,
        revisits: (appointmentsSummary._count || 0) - newPatients,
        // Chart data
        chartData: {
          labels,
          patients: dateKeys.map(key => patientsByDate[key] || 0),
          consultations: dateKeys.map(key => appointmentsByDate[key] || 0)
        },
        // Breakdown data
        byStatus,
        byType
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /pharmacy - Pharmacy report
router.get('/pharmacy', checkPermission('reports', 'pharmacy'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate, groupBy = 'day' } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

    // Generate date buckets for chart
    const { labels, dateKeys } = generateDateBuckets(dateRange.gte, dateRange.lte, groupBy);

    // Get pharmacy sales from bills with PHARMACY type
    const pharmacyBills = await prisma.bill.findMany({
      where: { clinicId, type: 'PHARMACY', createdAt: dateRange },
      select: { createdAt: true, totalAmount: true }
    });

    // Aggregate pharmacy sales by date
    const salesByDate = {};
    dateKeys.forEach(key => salesByDate[key] = 0);
    pharmacyBills.forEach(bill => {
      const dateKey = groupBy === 'month'
        ? `${bill.createdAt.getFullYear()}-${String(bill.createdAt.getMonth() + 1).padStart(2, '0')}`
        : bill.createdAt.toISOString().split('T')[0];
      if (salesByDate[dateKey] !== undefined) {
        salesByDate[dateKey] += bill.totalAmount || 0;
      }
    });

    // Calculate total sales from pharmacy bills
    const totalSales = pharmacyBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const [stockSummary, lowStock, stockMovement] = await Promise.all([
      prisma.pharmacyProduct.aggregate({
        where: { clinicId },
        _count: true,
        _sum: { quantity: true }
      }),
      prisma.pharmacyProduct.findMany({
        where: { clinicId, isActive: true, quantity: { lte: 10 } },
        select: { id: true, code: true, name: true, quantity: true, minStock: true },
        orderBy: { quantity: 'asc' },
        take: 20
      }),
      prisma.stockHistory.groupBy({
        by: ['type'],
        where: { product: { clinicId }, createdAt: dateRange },
        _sum: { quantity: true },
        _count: true
      })
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        // Summary stats
        totalSales,
        totalTransactions: pharmacyBills.length,
        totalProducts: stockSummary._count || 0,
        totalStock: stockSummary._sum.quantity || 0,
        lowStockCount: lowStock.length,
        // Chart data
        chartData: {
          labels,
          sales: dateKeys.map(key => salesByDate[key] || 0)
        },
        // Detailed data
        lowStock,
        stockMovement
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /patients - Patients report
router.get('/patients', checkPermission('reports', 'patients'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

    const [patientsSummary, newPatients, byGender] = await Promise.all([
      prisma.patient.count({ where: { clinicId } }),
      prisma.patient.count({ where: { clinicId, createdAt: dateRange } }),
      prisma.patient.groupBy({
        by: ['gender'],
        where: { clinicId },
        _count: true
      })
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        summary: {
          totalPatients: patientsSummary,
          newPatients
        },
        byGender
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /collections - Collections report
router.get('/collections', checkPermission('reports', 'collections'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

    const [collectionsSummary, byMethod, pendingBills] = await Promise.all([
      prisma.payment.aggregate({
        where: { clinicId, createdAt: dateRange },
        _sum: { amount: true },
        _count: true
      }),
      prisma.payment.groupBy({
        by: ['method'],
        where: { clinicId, createdAt: dateRange },
        _sum: { amount: true },
        _count: true
      }),
      prisma.bill.aggregate({
        where: { clinicId, paymentStatus: { in: ['PENDING', 'PARTIAL'] }, dueAmount: { gt: 0 } },
        _sum: { dueAmount: true },
        _count: true
      })
    ]);

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        summary: {
          totalCollected: collectionsSummary._sum.amount || 0,
          totalTransactions: collectionsSummary._count,
          pendingAmount: pendingBills._sum.dueAmount || 0,
          pendingBillsCount: pendingBills._count
        },
        byMethod
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /commissions - Commission report
router.get('/commissions', checkPermission('reports', 'commissions'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

    const [labs, agents] = await Promise.all([
      prisma.lab.findMany({ where: { clinicId }, select: { id: true, name: true } }),
      prisma.agent.findMany({ where: { clinicId }, select: { id: true, name: true } }),
    ]);
    const labIds = labs.map((l) => l.id);
    const agentIds = agents.map((a) => a.id);
    const noId = '__none__';
    const where = {
      createdAt: dateRange,
      OR: [
        { labId: { in: labIds.length ? labIds : [noId] } },
        { agentId: { in: agentIds.length ? agentIds : [noId] } }
      ]
    };

    const [summary, byLab, byAgent, pending] = await Promise.all([
      prisma.commissionRecord.aggregate({
        where,
        _sum: { amount: true, billAmount: true },
        _count: true
      }),
      prisma.commissionRecord.groupBy({
        by: ['labId'],
        where: { ...where, labId: { not: null } },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commissionRecord.groupBy({
        by: ['agentId'],
        where: { ...where, agentId: { not: null } },
        _sum: { amount: true },
        _count: true
      }),
      prisma.commissionRecord.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { amount: true },
        _count: true
      })
    ]);

    const labMap = new Map(labs.map((l) => [l.id, l.name]));
    const agentMap = new Map(agents.map((a) => [a.id, a.name]));
    const byLabDetailed = byLab.map((row) => ({
      labId: row.labId,
      name: labMap.get(row.labId) || 'Unknown Lab',
      amount: row._sum?.amount || 0,
      count: row._count || 0
    }));
    const byAgentDetailed = byAgent.map((row) => ({
      agentId: row.agentId,
      name: agentMap.get(row.agentId) || 'Unknown Agent',
      amount: row._sum?.amount || 0,
      count: row._count || 0
    }));

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        summary: {
          totalCommission: summary._sum.amount || 0,
          totalBillAmount: summary._sum.billAmount || 0,
          count: summary._count,
          pendingAmount: pending._sum.amount || 0,
          pendingCount: pending._count
        },
        byLab: byLabDetailed,
        byAgent: byAgentDetailed
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

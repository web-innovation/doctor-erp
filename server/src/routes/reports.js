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

// GET /sales - Sales report
router.get('/sales', checkPermission('reports', 'sales'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

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

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        summary: {
          totalBills: billsSummary._count,
          totalRevenue: billsSummary._sum.totalAmount || 0,
          totalCollected: billsSummary._sum.paidAmount || 0,
          totalDue: billsSummary._sum.dueAmount || 0,
          totalTax: billsSummary._sum.taxAmount || 0
        },
        byType: billsByType,
        byPaymentMethod: paymentsByMethod,
        topPatients
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /opd - OPD report
router.get('/opd', checkPermission('reports', 'opd'), async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

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

    res.json({
      success: true,
      data: {
        period,
        dateRange,
        summary: {
          totalAppointments: appointmentsSummary._count,
          totalConsultationFees: appointmentsSummary._sum.consultationFee || 0
        },
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
    const { period = 'month', startDate, endDate } = req.query;
    const clinicId = req.user.clinicId;
    const dateRange = getDateRange(period, startDate, endDate);

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
        summary: {
          totalProducts: stockSummary._count,
          totalStock: stockSummary._sum.quantity || 0
        },
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
    const { period = 'month', startDate, endDate, type } = req.query;
    const dateRange = getDateRange(period, startDate, endDate);

    const where = { createdAt: dateRange };

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
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true
      })
    ]);

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
        byLab,
        byAgent
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

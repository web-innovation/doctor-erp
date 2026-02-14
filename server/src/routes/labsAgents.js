import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ==================== LABS ====================

// GET /labs - List labs
router.get('/labs', checkPermission('labs', 'read'), async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { clinicId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } }
      ];
    }

    const [labs, total] = await Promise.all([
      prisma.lab.findMany({
        where, skip, take: limitNum,
        orderBy: { name: 'asc' },
        include: { _count: { select: { bills: true, commissions: true } } }
      }),
      prisma.lab.count({ where })
    ]);

    res.json({
      success: true, data: labs,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /labs/:id - Get lab
router.get('/labs/:id', checkPermission('labs', 'read'), async (req, res, next) => {
  try {
    const lab = await prisma.lab.findUnique({
      where: { id: req.params.id },
      include: {
        commissions: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { bills: true } }
      }
    });
    if (!lab) return res.status(404).json({ success: false, message: 'Lab not found' });
    res.json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
});

// POST /labs - Create lab
router.post('/labs', checkPermission('labs', 'manage'), async (req, res, next) => {
  try {
    const { name, address, phone, email, contactPerson, commissionType, commissionValue } = req.body;
    const lab = await prisma.lab.create({
      data: {
        name, address, phone, email, contactPerson,
        commissionType: commissionType || 'PERCENTAGE',
        commissionValue: commissionValue || 0,
        clinicId: req.user.clinicId
      }
    });
    res.status(201).json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
});

// PUT /labs/:id - Update lab
router.put('/labs/:id', checkPermission('labs', 'manage'), async (req, res, next) => {
  try {
    const { name, address, phone, email, contactPerson, commissionType, commissionValue, isActive } = req.body;
    const lab = await prisma.lab.update({
      where: { id: req.params.id },
      data: { name, address, phone, email, contactPerson, commissionType, commissionValue, isActive }
    });
    res.json({ success: true, data: lab });
  } catch (error) {
    next(error);
  }
});

// ==================== AGENTS ====================

// GET /agents - List agents
router.get('/agents', checkPermission('agents', 'read'), async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { clinicId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where, skip, take: limitNum,
        orderBy: { name: 'asc' },
        include: { _count: { select: { bills: true, commissions: true } } }
      }),
      prisma.agent.count({ where })
    ]);

    res.json({
      success: true, data: agents,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /agents/:id - Get agent
router.get('/agents/:id', checkPermission('agents', 'read'), async (req, res, next) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        commissions: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { bills: true } }
      }
    });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

// POST /agents - Create agent
router.post('/agents', checkPermission('agents', 'manage'), async (req, res, next) => {
  try {
    const { name, phone, email, address, commissionType, commissionValue, discountAllowed } = req.body;
    const agent = await prisma.agent.create({
      data: {
        name, phone, email, address,
        commissionType: commissionType || 'PERCENTAGE',
        commissionValue: commissionValue || 0,
        discountAllowed: discountAllowed || 0,
        clinicId: req.user.clinicId
      }
    });
    res.status(201).json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

// PUT /agents/:id - Update agent
router.put('/agents/:id', checkPermission('agents', 'manage'), async (req, res, next) => {
  try {
    const { name, phone, email, address, commissionType, commissionValue, discountAllowed, isActive } = req.body;
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: { name, phone, email, address, commissionType, commissionValue, discountAllowed, isActive }
    });
    res.json({ success: true, data: agent });
  } catch (error) {
    next(error);
  }
});

// ==================== COMMISSIONS ====================

// GET /commissions - List commissions
router.get('/commissions', checkPermission('commissions', 'read'), async (req, res, next) => {
  try {
    const { labId, agentId, status, startDate, endDate, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (labId) where.labId = labId;
    if (agentId) where.agentId = agentId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [commissions, total] = await Promise.all([
      prisma.commissionRecord.findMany({
        where, skip, take: limitNum,
        include: {
          lab: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.commissionRecord.count({ where })
    ]);

    res.json({
      success: true, data: commissions,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /commissions/:id/pay - Mark commission as paid
router.put('/commissions/:id/pay', checkPermission('commissions', 'pay'), async (req, res, next) => {
  try {
    const commission = await prisma.commissionRecord.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() }
    });
    res.json({ success: true, data: commission });
  } catch (error) {
    next(error);
  }
});

export default router;

// ==================== LAB TEST CATALOG (CRUD for lab staff) ====================

// GET /labs/:labId/tests - list tests for a lab
router.get('/labs/:labId/tests', checkPermission('labs', 'tests'), async (req, res, next) => {
  try {
    const { labId } = req.params;
    const { search, isActive, page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const where = { labId, clinicId: req.user.clinicId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tests, total] = await Promise.all([
      prisma.labTest.findMany({ where, skip, take: parseInt(limit, 10), orderBy: { name: 'asc' } }),
      prisma.labTest.count({ where })
    ]);

    res.json({ success: true, data: tests, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total } });
  } catch (error) {
    next(error);
  }
});

// Helper to check if current user is lab staff for labId
async function isUserLabStaff(userId, labId) {
  const staff = await prisma.staff.findFirst({ where: { userId, clinicId: undefined } }).catch(() => null);
  // Prefer using staff by userId and clinicId matching will be checked below
  const labStaff = await prisma.labStaff.findFirst({ where: { labId, staffId: staff ? staff.id : undefined } }).catch(() => null);
  return !!labStaff;
}

// POST /labs/:labId/tests - create test (admin or lab staff)
router.post('/labs/:labId/tests', checkPermission('labs', 'manage'), async (req, res, next) => {
  try {
    const { labId } = req.params;
    const { name, code, category, description, price, currency } = req.body;

    // Only clinic admin or lab staff can add tests
    const isAdmin = req.user.isClinicAdmin || req.user.role === 'SUPER_ADMIN';
    const lab = await prisma.lab.findUnique({ where: { id: labId } });
    if (!lab || lab.clinicId !== req.user.clinicId) return res.status(404).json({ success: false, message: 'Lab not found' });

    let allowed = isAdmin;
    if (!allowed) {
      const labStaff = await prisma.labStaff.findFirst({ where: { labId, clinicId: req.user.clinicId, staff: { userId: req.user.id } }, include: { staff: true } }).catch(() => null);
      allowed = !!labStaff;
    }

    if (!allowed) return res.status(403).json({ success: false, message: 'Permission denied to add lab tests' });

    const test = await prisma.labTest.create({ data: { name, code, category, description, price: price || 0, currency: currency || 'INR', labId, clinicId: req.user.clinicId } });
    res.status(201).json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
});

// PUT /labs/:labId/tests/:testId - update test
router.put('/labs/:labId/tests/:testId', checkPermission('labs', 'manage'), async (req, res, next) => {
  try {
    const { labId, testId } = req.params;
    const { name, code, category, description, price, isActive, currency } = req.body;

    const lab = await prisma.lab.findUnique({ where: { id: labId } });
    if (!lab || lab.clinicId !== req.user.clinicId) return res.status(404).json({ success: false, message: 'Lab not found' });

    const isAdmin = req.user.isClinicAdmin || req.user.role === 'SUPER_ADMIN';
    let allowed = isAdmin;
    if (!allowed) {
      const labStaff = await prisma.labStaff.findFirst({ where: { labId, clinicId: req.user.clinicId, staff: { userId: req.user.id } }, include: { staff: true } }).catch(() => null);
      allowed = !!labStaff;
    }
    if (!allowed) return res.status(403).json({ success: false, message: 'Permission denied to update lab tests' });

    const updated = await prisma.labTest.update({ where: { id: testId }, data: { name, code, category, description, price, isActive, currency } });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /labs/:labId/tests/:testId - delete test
router.delete('/labs/:labId/tests/:testId', checkPermission('labs', 'manage'), async (req, res, next) => {
  try {
    const { labId, testId } = req.params;
    const lab = await prisma.lab.findUnique({ where: { id: labId } });
    if (!lab || lab.clinicId !== req.user.clinicId) return res.status(404).json({ success: false, message: 'Lab not found' });
    const isAdmin = req.user.isClinicAdmin || req.user.role === 'SUPER_ADMIN';
    let allowed = isAdmin;
    if (!allowed) {
      const labStaff = await prisma.labStaff.findFirst({ where: { labId, clinicId: req.user.clinicId, staff: { userId: req.user.id } }, include: { staff: true } }).catch(() => null);
      allowed = !!labStaff;
    }
    if (!allowed) return res.status(403).json({ success: false, message: 'Permission denied to delete lab tests' });

    await prisma.labTest.delete({ where: { id: testId } });
    res.json({ success: true, message: 'Lab test deleted' });
  } catch (error) {
    next(error);
  }
});

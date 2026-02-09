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
router.get('/commissions', checkPermission('labs', 'read'), async (req, res, next) => {
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
router.put('/commissions/:id/pay', checkPermission('labs', 'manage'), async (req, res, next) => {
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

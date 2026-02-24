import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission, requireRoleLevel } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET / - list accounts with optional search q
router.get('/', async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const q = (req.query.q || '').toString().trim();
    const where = { clinicId };
    if (q) {
      // Some Prisma versions/providers don't support `mode: 'insensitive'` on SQLite.
      where.name = { contains: q, mode: 'insensitive' };
    }
    const items = await prisma.account.findMany({ where, orderBy: { name: 'asc' }, take: 50 });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

// POST / - create account (requires elevated role)
router.post('/', requireRoleLevel('PHARMACIST'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const { name, type, meta } = req.body;
    if (!name || !name.toString().trim()) return res.status(422).json({ success: false, message: 'Account name required' });
    const acct = await prisma.account.create({ data: { clinicId, name: name.toString().trim(), type: type || null, meta: meta ? JSON.stringify(meta) : null, createdById: req.user.id } });
    res.status(201).json({ success: true, data: acct });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Account already exists' });
    }
    next(err);
  }
});

export default router;

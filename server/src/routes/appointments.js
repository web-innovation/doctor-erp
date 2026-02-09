import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Generate appointment number
async function generateAppointmentNo(clinicId) {
  const lastAppt = await prisma.appointment.findFirst({
    where: { clinicId },
    orderBy: { appointmentNo: 'desc' },
    select: { appointmentNo: true }
  });
  if (!lastAppt) return 'A-0001';
  const lastNum = parseInt(lastAppt.appointmentNo.split('-')[1], 10);
  return `A-${(lastNum + 1).toString().padStart(4, '0')}`;
}

// GET / - List appointments
router.get('/', checkPermission('appointments', 'read'), async (req, res, next) => {
  try {
    const { date, startDate, endDate, status, patientId, page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { clinicId };
    
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: d, lt: nextDay };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where, skip, take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: { patient: { select: { id: true, patientId: true, name: true, phone: true } } }
      }),
      prisma.appointment.count({ where })
    ]);

    res.json({
      success: true, data: appointments,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /calendar - Calendar view
router.get('/calendar', checkPermission('appointments', 'read'), async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const clinicId = req.user.clinicId;
    
    const m = parseInt(month) - 1 || new Date().getMonth();
    const y = parseInt(year) || new Date().getFullYear();
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59);

    const appointments = await prisma.appointment.findMany({
      where: { clinicId, date: { gte: startDate, lte: endDate } },
      include: { patient: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }]
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
});

// GET /today - Today's appointments
router.get('/today', checkPermission('appointments', 'read'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: { clinicId, date: { gte: today, lt: tomorrow } },
      include: { patient: { select: { id: true, patientId: true, name: true, phone: true } } },
      orderBy: { timeSlot: 'asc' }
    });

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
});

// GET /:id - Get appointment by ID
router.get('/:id', checkPermission('appointments', 'read'), async (req, res, next) => {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        prescription: { include: { medicines: true, labTests: true } }
      }
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// POST / - Create appointment
router.post('/', checkPermission('appointments', 'create'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const appointmentNo = await generateAppointmentNo(clinicId);
    const { patientId, date, timeSlot, type, symptoms, notes, consultationFee, bookedVia } = req.body;

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNo, patientId, clinicId,
        date: new Date(date), timeSlot,
        type: type || 'CONSULTATION',
        symptoms, notes, consultationFee,
        bookedVia: bookedVia || 'CLINIC',
        status: 'SCHEDULED'
      },
      include: { patient: { select: { id: true, name: true, phone: true } } }
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - Update appointment
router.put('/:id', checkPermission('appointments', 'update'), async (req, res, next) => {
  try {
    const { date, timeSlot, type, status, symptoms, notes, consultationFee } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        date: date ? new Date(date) : undefined,
        timeSlot, type, status, symptoms, notes, consultationFee,
        confirmedAt: status === 'CONFIRMED' ? new Date() : undefined
      },
      include: { patient: { select: { id: true, name: true, phone: true } } }
    });

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// PUT /:id/status - Update status
router.put('/:id/status', checkPermission('appointments', 'update'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status, confirmedAt: status === 'CONFIRMED' ? new Date() : undefined }
    });
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Delete appointment
router.delete('/:id', checkPermission('appointments', 'delete'), async (req, res, next) => {
  try {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Appointment deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;

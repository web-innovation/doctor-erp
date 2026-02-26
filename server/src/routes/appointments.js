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

function isPatientUser(req) {
  const role = (req.user?.effectiveRole || req.user?.role || '').toString().toUpperCase();
  return role.split(/[^A-Z0-9]+/).includes('PATIENT');
}

function getPhoneCandidates(req) {
  const userPhoneRaw = req.user?.phone || '';
  const digits = String(userPhoneRaw).replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const candidates = new Set();
  if (userPhoneRaw) candidates.add(userPhoneRaw);
  if (digits) candidates.add(digits);
  if (last10) candidates.add(last10);
  if (last10 && !last10.startsWith('91')) candidates.add('91' + last10);
  return Array.from(candidates);
}

function getClinicScope(req) {
  if (!isPatientUser(req)) return req.user.clinicId;
  const fromHeader = req.headers['x-clinic-id'];
  const fromQuery = req.query?.clinicId;
  return (fromHeader || fromQuery || req.user.clinicId || null);
}

async function resolveLinkedPatientForMobile(req, clinicId, preferredPatientId = null) {
  const phoneCandidates = getPhoneCandidates(req);
  const orClauses = [];
  phoneCandidates.forEach((p) => orClauses.push({ phone: p }));
  if (req.user?.email) orClauses.push({ email: req.user.email });

  if (preferredPatientId) {
    const preferred = await prisma.patient.findFirst({
      where: { id: String(preferredPatientId), clinicId, OR: orClauses }
    });
    if (preferred) return preferred;
  }

  return prisma.patient.findFirst({ where: { clinicId, OR: orClauses } });
}

function parseDateInputToDate(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}

// GET / - List appointments
router.get('/', checkPermission('appointments', 'read'), async (req, res, next) => {
  try {
    const { date, startDate, endDate, status, type, patientId, search, page = 1, limit = 20, sortBy = 'date', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = getClinicScope(req);
    if (!clinicId) return res.status(400).json({ success: false, message: 'Clinic context is required' });

    const where = { clinicId };
    
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: d, lt: nextDay };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const nextDay = new Date(end);
        nextDay.setDate(nextDay.getDate() + 1);
        where.date.lt = nextDay;
      }
    }
    
    if (status) where.status = status;
    if (type) where.type = String(type).toUpperCase();
    if (patientId === 'me') {
      // Resolve mobile 'me' to linked Patient using phone/email variants
      const preferredPatientId = req.headers['x-patient-id'] || req.query?.patientProfileId || null;
      const linkedPatient = await resolveLinkedPatientForMobile(req, clinicId, preferredPatientId);
      const phoneCandidates = getPhoneCandidates(req);
      try { console.log('[Appointments DEBUG] resolving patientId=me', { user: req.user.id, phoneCandidates, linkedPatient: linkedPatient ? { id: linkedPatient.id, patientId: linkedPatient.patientId } : null }); } catch (e) {}
      if (linkedPatient) where.patientId = linkedPatient.id; else return res.json({ success: true, data: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } });
    } else if (patientId) {
      if (typeof patientId === 'string' && patientId.startsWith('P-')) {
        const p = await prisma.patient.findFirst({ where: { patientId: patientId, clinicId } });
        if (p) where.patientId = p.id; else where.patientId = patientId;
      } else {
        where.patientId = patientId;
      }
    }

    if (search) {
      where.OR = [
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { phone: { contains: search, mode: 'insensitive' } } },
        { patientId: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Restrict to doctor's own appointments by default. Support optional `viewUserId` to view a staff user's appointments.
    const viewUserId = req.query.viewUserId;
    const { isEffectiveDoctor, canDoctorViewStaff } = await import('../middleware/auth.js');
    const doctorCheck = isEffectiveDoctor(req);
    if (doctorCheck) {
      const viewCheck = await canDoctorViewStaff(req, viewUserId);
      if (viewCheck.notStaff) return res.status(404).json({ success: false, message: 'Requested user is not a staff member' });
      if (!viewCheck.allowed) return res.status(403).json({ success: false, message: 'Permission denied for requested view' });
      if (viewUserId) {
        where.doctorId = viewUserId === req.user.id ? req.user.id : viewUserId;
      } else {
        where.doctorId = req.user.id;
      }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where, skip, take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: { select: { id: true, patientId: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } }
        }
      }),
      prisma.appointment.count({ where })
    ]);

    // Provide a lightweight alias for frontend convenience
    const mapped = appointments.map(a => ({
      ...a,
      doctorName: a.doctor ? a.doctor.name : undefined
    }));

    res.json({
      success: true, data: mapped,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /doctors - List clinic doctors (accessible to authenticated users)
router.get('/doctors', async (req, res, next) => {
  try {
    const clinicId = getClinicScope(req);
    if (!clinicId) return res.status(400).json({ success: false, message: 'Clinic context is required' });
    // Users with role DOCTOR
    const usersDoctors = await prisma.user.findMany({ where: { clinicId, role: 'DOCTOR' }, select: { id: true, name: true, email: true } });

    // Staff records — fetch by clinic and filter designation in JS
    const rawStaff = await prisma.staff.findMany({ where: { clinicId }, include: { user: { select: { id: true, name: true, email: true } } } });
    const staffDoctors = rawStaff.filter(s => s.designation && s.designation.toLowerCase().includes('doctor'));

    const map = new Map();
    usersDoctors.forEach(u => map.set(u.id, { id: u.id, name: u.name, email: u.email }));
    staffDoctors.forEach(s => { if (s.user) map.set(s.user.id, { id: s.user.id, name: s.user.name, email: s.user.email }); });

    const doctors = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ success: true, data: doctors });
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
    const clinicId = getClinicScope(req);
    if (!clinicId) return res.status(400).json({ success: false, message: 'Clinic context is required' });

    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, clinicId },
      include: {
        patient: true,
        doctor: { select: { id: true, name: true } },
        prescription: { include: { medicines: true, labTests: true } }
      }
    });
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    // Enforce patient-only scope for mobile
    if (isPatientUser(req)) {
      const preferredPatientId = req.headers['x-patient-id'] || req.query?.patientProfileId || null;
      const linkedPatient = await resolveLinkedPatientForMobile(req, clinicId, preferredPatientId);
      if (!linkedPatient || appointment.patientId !== linkedPatient.id) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
    }

    // Enforce doctor-only access for appointment detail. Allow viewing when `viewUserId` is provided and authorized.
    if ((req.user.effectiveRole || '').toString().toUpperCase() === 'DOCTOR') {
      const viewUserId = req.query.viewUserId;
      if (viewUserId) {
        if (viewUserId === req.user.id) {
          // allowed
        } else {
          const staff = await prisma.staff.findFirst({ where: { userId: viewUserId, clinicId: req.user.clinicId } });
          if (!staff) return res.status(404).json({ success: false, message: 'Requested user is not a staff member' });
          const assignment = await prisma.staffAssignment.findUnique({ where: { staffId_doctorId: { staffId: staff.id, doctorId: req.user.id } } }).catch(() => null);
          if (!assignment) return res.status(403).json({ success: false, message: 'Permission denied' });
        }
      } else {
        if (appointment.doctorId && appointment.doctorId !== req.user.id) return res.status(403).json({ success: false, message: 'Permission denied' });
      }
    }

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// POST / - Create appointment
router.post('/', async (req, res, next) => {
  try {
    // Allow authenticated users to create appointments for themselves (patient mobile flows)
    // or staff/users with create permission.
    const clinicIdFromBody = req.body?.clinicId || req.headers['x-clinic-id'] || req.query?.clinicId || null;
    const clinicId = isPatientUser(req) ? (clinicIdFromBody || req.user.clinicId) : req.user.clinicId;
    if (!clinicId) return res.status(400).json({ success: false, message: 'Clinic context is required' });
    const appointmentNo = await generateAppointmentNo(clinicId);
    let { patientId, date, timeSlot, type, symptoms, notes, consultationFee, bookedVia, doctorId } = req.body;

    // Support patient booking using 'me' — resolve linked patient by phone/email
    if (patientId === 'me') {
      const preferredPatientId = req.body?.patientProfileId || req.headers['x-patient-id'] || req.query?.patientProfileId || null;
      const linkedPatient = await resolveLinkedPatientForMobile(req, clinicId, preferredPatientId);
      if (!linkedPatient) return res.status(400).json({ success: false, message: 'Could not resolve linked patient for booking' });
      patientId = linkedPatient.id;
    }

    // If user is a PATIENT and attempting to book for someone else, disallow
    if ((req.user.effectiveRole || '').toString().toUpperCase() === 'PATIENT') {
      const linked = await resolveLinkedPatientForMobile(req, clinicId, patientId);
      if (!linked) return res.status(403).json({ success: false, message: 'Permission denied to book for this patient' });
      patientId = linked.id;
    }

    // If doctorId omitted and user is a doctor, default to current user
    const doctorIdFinal = doctorId || ((req.user.effectiveRole || '').toString().toUpperCase() === 'DOCTOR' ? req.user.id : undefined);

    // Server-side validation: appointment datetime must not be in the past
    try {
      const parsedDate = parseDateInputToDate(date);
      if (parsedDate && timeSlot) {
        const isoDate = parsedDate.toISOString().split('T')[0];
        const apptDt = new Date(`${isoDate}T${timeSlot}`);
        if (apptDt < new Date()) {
          return res.status(400).json({ success: false, message: 'Appointment date and time cannot be in the past' });
        }
      } else if (parsedDate) {
        const apptDateOnly = new Date(parsedDate);
        apptDateOnly.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (apptDateOnly < today) return res.status(400).json({ success: false, message: 'Appointment date cannot be in the past' });
      }
    } catch (e) {
      // fall through to allow create and let later DB or other validations handle parse errors
    }

    // If a patient is creating the appointment via mobile, put it into REVIEW state
    const isPatient = ((req.user.effectiveRole || '').toString().toUpperCase() === 'PATIENT');
    const statusFinal = isPatient ? 'REVIEW' : 'SCHEDULED';

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNo,
        patientId,
        clinicId,
        date: date ? parseDateInputToDate(date) : undefined,
        timeSlot,
        type: type || 'CONSULTATION',
        symptoms,
        notes,
        consultationFee,
        bookedVia: bookedVia || 'MOBILE',
        status: statusFinal,
        doctorId: doctorIdFinal
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

    // Fetch existing appointment to allow combining existing date/time with updates
    const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Server-side validation: ensure updated appointment datetime is not in the past
    try {
      const finalDate = date || (existing.date ? existing.date.toISOString().split('T')[0] : undefined);
      const parsedFinalDate = parseDateInputToDate(finalDate);
      const finalTime = timeSlot || existing.timeSlot;
      if (parsedFinalDate && finalTime) {
        const isoDate = parsedFinalDate.toISOString().split('T')[0];
        const apptDt = new Date(`${isoDate}T${finalTime}`);
        if (apptDt < new Date()) return res.status(400).json({ success: false, message: 'Appointment date and time cannot be in the past' });
      } else if (parsedFinalDate && !finalTime) {
        const apptDateOnly = new Date(parsedFinalDate);
        apptDateOnly.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (apptDateOnly < today) return res.status(400).json({ success: false, message: 'Appointment date cannot be in the past' });
      }
    } catch (e) {
      // ignore parse errors and let other validations handle
    }

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        date: date ? parseDateInputToDate(date) : undefined,
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
router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    // Allow patients to cancel their own appointments without broader update permission
    if ((req.user.effectiveRole || '').toString().toUpperCase() === 'PATIENT' && status === 'CANCELLED') {
      // Resolve linked patient for this user
      const clinicId = getClinicScope(req);
      if (!clinicId) return res.status(400).json({ success: false, message: 'Clinic context is required' });
      const preferredPatientId = req.headers['x-patient-id'] || req.query?.patientProfileId || null;
      const linkedPatient = await resolveLinkedPatientForMobile(req, clinicId, preferredPatientId);
      if (!linkedPatient) return res.status(403).json({ success: false, message: 'Linked patient not found' });

      const appointment = await prisma.appointment.findFirst({ where: { id: req.params.id, clinicId } });
      if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
      if (appointment.patientId !== linkedPatient.id) return res.status(403).json({ success: false, message: 'Permission denied to cancel this appointment' });

      const updated = await prisma.appointment.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
      return res.json({ success: true, data: updated });
    }

    // Otherwise require normal permission to update status
    const perm = checkPermission('appointments', 'update');
    await new Promise((resolve, reject) => {
      try {
        perm(req, res, (err) => { if (err) return reject(err); resolve(); });
      } catch (e) { reject(e); }
    });

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

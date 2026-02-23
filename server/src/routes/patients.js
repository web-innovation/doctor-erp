import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Generate patient ID
async function generatePatientId(clinicId) {
  const lastPatient = await prisma.patient.findFirst({
    where: { clinicId },
    orderBy: { patientId: 'desc' },
    select: { patientId: true }
  });
  if (!lastPatient) return 'P-0001';
  const lastNum = parseInt(lastPatient.patientId.split('-')[1], 10);
  return `P-${(lastNum + 1).toString().padStart(4, '0')}`;
}

// Compute age in years from a date string (returns undefined for invalid input)
function computeAgeFromDOB(dobStr) {
  if (!dobStr) return undefined;
  const d = parsePatientDate(dobStr);
  if (Number.isNaN(d.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age;
}

function parsePatientDate(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd) return d;
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// GET / - List patients
router.get('/', checkPermission('patients', 'read'), async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { clinicId };
    if (search) {
      where.OR = [
        { patientId: { contains: search } },
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [patientsRaw, total] = await Promise.all([
      prisma.patient.findMany({
        where, skip, take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          appointments: { take: 1, orderBy: { date: 'desc' }, select: { date: true } }
        }
      }),
      prisma.patient.count({ where })
    ]);

    // Map and normalize fields for frontend convenience
    const patients = patientsRaw.map((p) => ({
      id: p.id,
      patientId: p.patientId,
      name: p.name,
      phone: p.phone,
      email: p.email,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
      age: p.age,
      bloodGroup: p.bloodGroup,
      createdAt: p.createdAt,
      // lastVisit derived from latest appointment if available
      lastVisit: p.appointments && p.appointments.length > 0 ? p.appointments[0].date : null
    }));

    res.json({
      success: true, data: patients,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id - Get patient by ID
router.get('/:id', checkPermission('patients', 'read'), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: { orderBy: { date: 'desc' }, take: 10, include: { prescription: true } },
        prescriptions: { orderBy: { date: 'desc' }, take: 10 },
        bills: { orderBy: { date: 'desc' }, take: 10 },
        vitals: { orderBy: { recordedAt: 'desc' }, take: 10 }
      }
    });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Parse JSON fields and normalize names for frontend
    const parsed = {
      ...patient,
      allergies: patient.allergies ? JSON.parse(patient.allergies) : [],
      medicalHistory: patient.medicalHistory ? JSON.parse(patient.medicalHistory) : [],
      insurance: patient.insurance || null,
    };

    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
});

// POST / - Create patient
router.post('/', checkPermission('patients', 'create'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const patientId = await generatePatientId(clinicId);
    const { name, phone, email, gender, dateOfBirth, age, bloodGroup, address, city, emergencyContact, allergies, medicalHistory, insurance } = req.body;
    const normalizedGender = gender ? String(gender).toUpperCase() : undefined;
    const parsedDOB = dateOfBirth ? parsePatientDate(dateOfBirth) : null;

    // Determine numeric age: prefer explicit `age` coerced to int, otherwise compute from dateOfBirth
    let ageValue;
    if (age !== undefined && age !== null && age !== '') {
      const parsed = parseInt(age, 10);
      if (!Number.isNaN(parsed)) ageValue = parsed;
    }
    if (ageValue === undefined) {
      const computed = computeAgeFromDOB(dateOfBirth);
      if (computed !== undefined) ageValue = computed;
    }

    // Build create data and only include `insurance` if Prisma client knows about it
    const createData = {
      patientId,
      name,
      phone,
      email,
      gender: normalizedGender,
      dateOfBirth: parsedDOB || null,
      age: typeof ageValue === 'number' ? ageValue : undefined,
      bloodGroup,
      address,
      city,
      emergencyContact,
      allergies: allergies ? JSON.stringify(allergies) : null,
      medicalHistory: medicalHistory ? JSON.stringify(medicalHistory) : null,
      insurance: insurance === undefined ? null : (String(insurance).trim() || null),
      clinicId
    };

    const patient = await prisma.patient.create({ data: createData });

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Patient with this phone already exists' });
    }
    next(error);
  }
});

// PUT /:id - Update patient
router.put('/:id', checkPermission('patients', 'update'), async (req, res, next) => {
  try {
    const { name, phone, email, gender, dateOfBirth, age, bloodGroup, address, city, emergencyContact, allergies, medicalHistory, insurance } = req.body;
    const normalizedGender = gender ? String(gender).toUpperCase() : undefined;
    const parsedDOB = dateOfBirth ? parsePatientDate(dateOfBirth) : null;

    // Coerce age to integer if provided, otherwise compute from dateOfBirth when present
    let ageValue;
    if (age !== undefined && age !== null && age !== '') {
      const parsed = parseInt(age, 10);
      if (!Number.isNaN(parsed)) ageValue = parsed;
    }
    if (ageValue === undefined && dateOfBirth) {
      const computed = computeAgeFromDOB(dateOfBirth);
      if (computed !== undefined) ageValue = computed;
    }

    // Build update object and only include `insurance` if Prisma client knows about it
    const updateData = {
      name,
      phone,
      email,
      gender: normalizedGender,
      dateOfBirth: dateOfBirth ? (parsedDOB || undefined) : undefined,
      age: typeof ageValue === 'number' ? ageValue : undefined,
      bloodGroup,
      address,
      city,
      emergencyContact,
      allergies: allergies ? JSON.stringify(allergies) : undefined,
      medicalHistory: medicalHistory ? JSON.stringify(medicalHistory) : undefined,
      insurance: insurance === undefined ? undefined : (String(insurance).trim() || null),
    };

    const patient = await prisma.patient.update({ where: { id: req.params.id }, data: updateData });

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Delete patient
router.delete('/:id', checkPermission('patients', 'delete'), async (req, res, next) => {
  try {
    await prisma.patient.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Patient deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /:id/vitals - Add vitals
router.post('/:id/vitals', checkPermission('patients', 'update'), async (req, res, next) => {
  try {
    const { weight, height, bloodPressure, pulse, temperature, spO2, bloodSugar, notes } = req.body;
    const vital = await prisma.patientVital.create({
      data: { patientId: req.params.id, weight, height, bloodPressure, pulse, temperature, spO2, bloodSugar, notes }
    });
    res.status(201).json({ success: true, data: vital });
  } catch (error) {
    next(error);
  }
});

// GET /:id/vitals - Get patient vitals
router.get('/:id/vitals', checkPermission('patients', 'read'), async (req, res, next) => {
  try {
    const vitals = await prisma.patientVital.findMany({
      where: { patientId: req.params.id },
      orderBy: { recordedAt: 'desc' }
    });
    res.json({ success: true, data: vitals });
  } catch (error) {
    next(error);
  }
});

// GET /:id/bills - Get patient bills
router.get('/:id/bills', checkPermission('patients', 'read'), async (req, res, next) => {
  try {
    const bills = await prisma.bill.findMany({
      where: { patientId: req.params.id },
      orderBy: { date: 'desc' },
      include: {
        items: true
      }
    });
    res.json({ success: true, data: bills });
  } catch (error) {
    next(error);
  }
});

// GET /:id/history - Get patient history
router.get('/:id/history', checkPermission('patients', 'read'), async (req, res, next) => {
  try {
    const [appointments, prescriptions, bills, vitals] = await Promise.all([
      prisma.appointment.findMany({ where: { patientId: req.params.id }, orderBy: { date: 'desc' } }),
      prisma.prescription.findMany({ where: { patientId: req.params.id }, orderBy: { date: 'desc' }, include: { medicines: true } }),
      prisma.bill.findMany({ where: { patientId: req.params.id }, orderBy: { date: 'desc' } }),
      prisma.patientVital.findMany({ where: { patientId: req.params.id }, orderBy: { recordedAt: 'desc' } })
    ]);
    res.json({ success: true, data: { appointments, prescriptions, bills, vitals } });
  } catch (error) {
    next(error);
  }
});

export default router;

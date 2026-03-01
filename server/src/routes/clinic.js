import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import {
  normalizeAccessControls as normalizeAccessControlsWithSubscription,
  getClinicControls,
  getSubscriptionSnapshot,
} from '../services/subscriptionService.js';

const router = express.Router();
router.use(authenticate);

const normalizeAccessControls = (value, clinicCreatedAt) =>
  normalizeAccessControlsWithSubscription(value, clinicCreatedAt || new Date());

function resolveClinicIdForRead(req) {
  const userClinicId = req?.user?.clinicId;
  if (userClinicId) return { clinicId: userClinicId, allowFallback: false };

  const roles = `${req?.user?.role || ''} ${req?.user?.effectiveRole || ''}`.toUpperCase();
  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  let fromQuery = req?.query?.clinicId || req?.headers?.['x-clinic-id'] || null;
  if (Array.isArray(fromQuery)) fromQuery = fromQuery[0] || null;
  if (fromQuery) return { clinicId: String(fromQuery), allowFallback: false };
  return { clinicId: null, allowFallback: isSuperAdmin };
}

function parseConsultationFees(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    Object.entries(parsed).forEach(([doctorId, amount]) => {
      const num = Number(amount);
      if (doctorId && Number.isFinite(num) && num >= 0) out[String(doctorId)] = num;
    });
    return out;
  } catch (e) {
    return {};
  }
}

const PRINT_TEMPLATE_KEY = 'print_templates';

function stripScriptTags(html) {
  if (typeof html !== 'string') return '';
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
}

function normalizePrintTemplateConfig(value) {
  const src = value && typeof value === 'object' ? value : {};
  const allowedTemplateIds = new Set(['classic', 'modern', 'compact', 'custom']);
  const normalizeId = (id, fallback) => {
    const v = String(id || '').trim().toLowerCase();
    return allowedTemplateIds.has(v) ? v : fallback;
  };

  return {
    billTemplateId: normalizeId(src.billTemplateId, 'classic'),
    prescriptionTemplateId: normalizeId(src.prescriptionTemplateId, 'modern'),
    customBillHtml: stripScriptTags(String(src.customBillHtml || '')).trim(),
    customPrescriptionHtml: stripScriptTags(String(src.customPrescriptionHtml || '')).trim(),
  };
}

async function getClinicDoctors(clinicId) {
  const usersDoctors = await prisma.user.findMany({
    where: { clinicId, role: 'DOCTOR' },
    select: { id: true, name: true, email: true }
  });

  const rawStaff = await prisma.staff.findMany({
    where: { clinicId },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  const staffDoctors = rawStaff.filter((s) => s.designation && s.designation.toLowerCase().includes('doctor'));

  const map = new Map();
  usersDoctors.forEach((u) => map.set(u.id, { id: u.id, name: u.name, email: u.email }));
  staffDoctors.forEach((s) => {
    if (s.user) map.set(s.user.id, { id: s.user.id, name: s.user.name, email: s.user.email });
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Helper function to get clinic data
async function getClinicData(clinicId, res, next) {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId }
    });

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // Parse JSON fields
    const result = {
      ...clinic,
      taxConfig: clinic.taxConfig ? JSON.parse(clinic.taxConfig) : null,
      workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null
    };

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// GET / - Get clinic settings (current user's clinic)
router.get('/', async (req, res, next) => {
  await getClinicData(req.user.clinicId, res, next);
});

// GET /settings - Alias for clinic settings
router.get('/settings', async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: req.user.clinicId }
    });

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // Parse JSON fields
    const result = {
      ...clinic,
      taxConfig: clinic.taxConfig ? JSON.parse(clinic.taxConfig) : null,
      workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null
    };

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PUT / - Update clinic settings
router.put('/', checkPermission('settings', 'clinic'), async (req, res, next) => {
  try {
    const { 
      name, logo, address, city, state, pincode, phone, email, website,
      gstNumber, licenseNumber, taxConfig, workingHours, slotDuration
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (pincode) updateData.pincode = pincode;
    if (phone) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (taxConfig !== undefined) updateData.taxConfig = JSON.stringify(taxConfig);
    if (workingHours !== undefined) updateData.workingHours = JSON.stringify(workingHours);
    if (slotDuration !== undefined) updateData.slotDuration = parseInt(slotDuration);

    const clinic = await prisma.clinic.update({
      where: { id: req.user.clinicId },
      data: updateData
    });

    res.json({ 
      success: true, 
      data: {
        ...clinic,
        taxConfig: clinic.taxConfig ? JSON.parse(clinic.taxConfig) : null,
        workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null
      },
      message: 'Clinic updated successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// GET /working-hours - Get working hours
router.get('/working-hours', async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: req.user.clinicId },
      select: { workingHours: true, slotDuration: true }
    });

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    res.json({ 
      success: true, 
      data: {
        workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null,
        slotDuration: clinic.slotDuration
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /working-hours - Update working hours
router.put('/working-hours', checkPermission('settings', 'clinic'), async (req, res, next) => {
  try {
    const { workingHours, slotDuration } = req.body;

    const updateData = {};
    if (workingHours !== undefined) updateData.workingHours = JSON.stringify(workingHours);
    if (slotDuration !== undefined) updateData.slotDuration = parseInt(slotDuration);

    const clinic = await prisma.clinic.update({
      where: { id: req.user.clinicId },
      data: updateData
    });

    res.json({ 
      success: true, 
      data: {
        workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null,
        slotDuration: clinic.slotDuration
      },
      message: 'Working hours updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /tax-config - Get tax configuration
router.get('/tax-config', async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: req.user.clinicId },
      select: { taxConfig: true, gstNumber: true }
    });

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    res.json({ 
      success: true, 
      data: {
        taxConfig: clinic.taxConfig ? JSON.parse(clinic.taxConfig) : null,
        gstNumber: clinic.gstNumber
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /role-permissions - Get role permission overrides for the clinic
// Allow any authenticated clinic user to read role overrides so UI can adapt per-clinic settings
router.get('/role-permissions', async (req, res, next) => {
  try {
    const { clinicId, allowFallback } = resolveClinicIdForRead(req);
    if (!clinicId && allowFallback) return res.json({ success: true, data: null });
    if (!clinicId) return res.status(400).json({ success: false, message: 'clinicId is required' });

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { rolePermissions: true } });
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    const data = clinic.rolePermissions ? JSON.parse(clinic.rolePermissions) : null;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /access-controls - super admin access controls for the clinic (read-only)
router.get('/access-controls', async (req, res, next) => {
  try {
    const { clinicId, allowFallback } = resolveClinicIdForRead(req);
    if (!clinicId && allowFallback) {
      const empty = normalizeAccessControls({});
      return res.json({ success: true, data: { ...empty, subscriptionSnapshot: getSubscriptionSnapshot(empty) } });
    }
    if (!clinicId) return res.status(400).json({ success: false, message: 'clinicId is required' });

    const data = await getClinicControls(clinicId);
    res.json({ success: true, data: { ...data, subscriptionSnapshot: getSubscriptionSnapshot(data) } });
  } catch (error) {
    next(error);
  }
});

// PUT /role-permissions - Update role permission overrides for the clinic
router.put('/role-permissions', checkPermission('settings', 'clinic'), async (req, res, next) => {
  try {
    const { rolePermissions } = req.body;
    const updateData = { rolePermissions: rolePermissions ? JSON.stringify(rolePermissions) : null };
    const clinic = await prisma.clinic.update({ where: { id: req.user.clinicId }, data: updateData });
    res.json({ success: true, data: clinic.rolePermissions ? JSON.parse(clinic.rolePermissions) : null, message: 'Role permissions updated' });
  } catch (error) {
    next(error);
  }
});

// PUT /tax-config - Update tax configuration
router.put('/tax-config', checkPermission('settings', 'clinic'), async (req, res, next) => {
  try {
    const { taxConfig, gstNumber } = req.body;

    const updateData = {};
    if (taxConfig !== undefined) updateData.taxConfig = JSON.stringify(taxConfig);
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;

    const clinic = await prisma.clinic.update({
      where: { id: req.user.clinicId },
      data: updateData
    });

    res.json({ 
      success: true, 
      data: {
        taxConfig: clinic.taxConfig ? JSON.parse(clinic.taxConfig) : null,
        gstNumber: clinic.gstNumber
      },
      message: 'Tax configuration updated successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// GET /consultation-fees - Get per-doctor consultation fee configuration for clinic
router.get('/consultation-fees', async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const [row, doctors] = await Promise.all([
      prisma.clinicSettings.findUnique({
        where: { clinicId_key: { clinicId, key: 'consultation_fees' } },
        select: { value: true }
      }),
      getClinicDoctors(clinicId)
    ]);

    const fees = parseConsultationFees(row?.value || '{}');
    res.json({ success: true, data: { doctors, fees } });
  } catch (error) {
    next(error);
  }
});

// PUT /consultation-fees - Save per-doctor consultation fee configuration for clinic
router.put('/consultation-fees', checkPermission('settings', 'clinic'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const fees = parseConsultationFees(req.body?.fees || {});

    await prisma.clinicSettings.upsert({
      where: { clinicId_key: { clinicId, key: 'consultation_fees' } },
      update: { value: JSON.stringify(fees) },
      create: { clinicId, key: 'consultation_fees', value: JSON.stringify(fees) }
    });

    res.json({ success: true, data: { fees }, message: 'Consultation fees updated successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /print-templates - Get print template settings for bill and prescription
router.get('/print-templates', async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const row = await prisma.clinicSettings.findUnique({
      where: { clinicId_key: { clinicId, key: PRINT_TEMPLATE_KEY } },
      select: { value: true }
    });
    const parsed = row?.value ? JSON.parse(row.value) : {};
    const config = normalizePrintTemplateConfig(parsed);
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
});

// PUT /print-templates - Save print template settings for bill and prescription
router.put('/print-templates', checkPermission('settings', 'clinic'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const config = normalizePrintTemplateConfig(req.body || {});

    await prisma.clinicSettings.upsert({
      where: { clinicId_key: { clinicId, key: PRINT_TEMPLATE_KEY } },
      update: { value: JSON.stringify(config) },
      create: { clinicId, key: PRINT_TEMPLATE_KEY, value: JSON.stringify(config) }
    });

    res.json({ success: true, data: config, message: 'Print templates updated successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /stats - Get clinic statistics
router.get('/stats', async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;

    const [
      totalPatients,
      totalStaff,
      totalProducts,
      totalLabs,
      totalAgents
    ] = await Promise.all([
      prisma.patient.count({ where: { clinicId } }),
      prisma.staff.count({ where: { clinicId } }),
      prisma.pharmacyProduct.count({ where: { clinicId } }),
      prisma.lab.count({ where: { clinicId } }),
      prisma.agent.count({ where: { clinicId } })
    ]);

    res.json({
      success: true,
      data: {
        totalPatients,
        totalStaff,
        totalProducts,
        totalLabs,
        totalAgents
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

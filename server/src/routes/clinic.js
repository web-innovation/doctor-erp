import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

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
    const clinic = await prisma.clinic.findUnique({ where: { id: req.user.clinicId }, select: { rolePermissions: true } });
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    const data = clinic.rolePermissions ? JSON.parse(clinic.rolePermissions) : null;
    res.json({ success: true, data });
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

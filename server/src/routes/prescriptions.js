import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Generate prescription number
async function generatePrescriptionNo() {
  const lastPrescription = await prisma.prescription.findFirst({
    orderBy: { prescriptionNo: 'desc' },
    select: { prescriptionNo: true }
  });
  
  if (!lastPrescription) {
    return 'RX-0001';
  }
  
  const lastNumber = parseInt(lastPrescription.prescriptionNo.split('-')[1], 10);
  const newNumber = lastNumber + 1;
  return `RX-${newNumber.toString().padStart(4, '0')}`;
}

// GET / - List prescriptions
router.get('/', checkPermission('prescriptions', 'read'), async (req, res, next) => {
  try {
    const {
      patientId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = { clinicId: req.user.clinicId };

    if (patientId) where.patientId = patientId;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: {
            select: { id: true, patientId: true, name: true, phone: true }
          },
          medicines: true,
          labTests: true,
          appointment: {
            select: { id: true, appointmentNo: true, date: true }
          }
        }
      }),
      prisma.prescription.count({ where })
    ]);

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id - Get prescription details
router.get('/:id', checkPermission('prescriptions', 'read'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const prescription = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId },
      include: {
        patient: {
          select: { id: true, patientId: true, name: true, phone: true, email: true }
        },
        medicines: {
          include: {
            pharmacyProduct: {
              select: { id: true, name: true, code: true }
            }
          }
        },
        labTests: {
          include: {
            lab: { select: { id: true, name: true } }
          }
        },
        appointment: true
      }
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Parse JSON fields
    const result = {
      ...prescription,
      diagnosis: prescription.diagnosis ? JSON.parse(prescription.diagnosis) : [],
      symptoms: prescription.symptoms ? JSON.parse(prescription.symptoms) : [],
      vitalsSnapshot: prescription.vitalsSnapshot ? JSON.parse(prescription.vitalsSnapshot) : null
    };

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST / - Create prescription
router.post('/', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      diagnosis,
      symptoms,
      clinicalNotes,
      advice,
      followUpDate,
      medicines = [],
      labTests = [],
      vitalsSnapshot
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }

    // Verify patient exists
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: req.user.clinicId }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const prescriptionNo = await generatePrescriptionNo();

    const prescription = await prisma.prescription.create({
      data: {
        prescriptionNo,
        clinicId: req.user.clinicId,
        patientId,
        appointmentId: appointmentId || undefined,
        diagnosis: diagnosis ? JSON.stringify(diagnosis) : null,
        symptoms: symptoms ? JSON.stringify(symptoms) : null,
        clinicalNotes,
        advice,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        vitalsSnapshot: vitalsSnapshot ? JSON.stringify(vitalsSnapshot) : null,
        medicines: {
          create: medicines.map(med => ({
            medicineName: med.medicineName,
            genericName: med.genericName,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            timing: med.timing,
            quantity: parseInt(med.quantity) || 1,
            instructions: med.instructions,
            productId: med.productId || null
          }))
        },
        labTests: {
          create: labTests.map(test => ({
            testName: test.testName,
            instructions: test.instructions,
            labId: test.labId || null
          }))
        }
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        medicines: true,
        labTests: true
      }
    });

    // If linked to appointment, update appointment status
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' }
      }).catch(() => {}); // Ignore errors
    }

    res.status(201).json({
      success: true,
      data: prescription,
      message: 'Prescription created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - Update prescription
router.put('/:id', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      diagnosis,
      symptoms,
      clinicalNotes,
      advice,
      followUpDate
    } = req.body;

    const existing = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const updateData = {};
    if (diagnosis !== undefined) updateData.diagnosis = JSON.stringify(diagnosis);
    if (symptoms !== undefined) updateData.symptoms = JSON.stringify(symptoms);
    if (clinicalNotes !== undefined) updateData.clinicalNotes = clinicalNotes;
    if (advice !== undefined) updateData.advice = advice;
    if (followUpDate !== undefined) updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;

    const prescription = await prisma.prescription.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        medicines: true,
        labTests: true
      }
    });

    res.json({ success: true, data: prescription, message: 'Prescription updated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /:id/medicines - Add medicine to prescription
router.post('/:id/medicines', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { medicineName, genericName, dosage, frequency, duration, timing, quantity, instructions, productId } = req.body;

    const existing = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const medicine = await prisma.prescriptionMedicine.create({
      data: {
        prescriptionId: id,
        medicineName,
        genericName,
        dosage,
        frequency,
        duration,
        timing,
        quantity: parseInt(quantity) || 1,
        instructions,
        productId: productId || null
      }
    });

    res.status(201).json({ success: true, data: medicine, message: 'Medicine added successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id/medicines/:medicineId - Remove medicine from prescription
router.delete('/:id/medicines/:medicineId', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const { id, medicineId } = req.params;

    const existing = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    await prisma.prescriptionMedicine.delete({
      where: { id: medicineId }
    });

    res.json({ success: true, message: 'Medicine removed successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /:id/lab-tests - Add lab test to prescription
router.post('/:id/lab-tests', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { testName, instructions, labId } = req.body;

    const existing = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const labTest = await prisma.prescriptionLabTest.create({
      data: {
        prescriptionId: id,
        testName,
        instructions,
        labId: labId || null
      }
    });

    res.status(201).json({ success: true, data: labTest, message: 'Lab test added successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id/lab-tests/:testId - Remove lab test from prescription
router.delete('/:id/lab-tests/:testId', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const { id, testId } = req.params;

    const existing = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    await prisma.prescriptionLabTest.delete({
      where: { id: testId }
    });

    res.json({ success: true, message: 'Lab test removed successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /patient/:patientId - Get prescriptions for a patient
router.get('/patient/:patientId', checkPermission('prescriptions', 'read'), async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { limit = 10 } = req.query;

    const prescriptions = await prisma.prescription.findMany({
      where: { patientId, clinicId: req.user.clinicId },
      take: parseInt(limit),
      orderBy: { date: 'desc' },
      include: {
        medicines: true,
        labTests: true
      }
    });

    res.json({ success: true, data: prescriptions });
  } catch (error) {
    next(error);
  }
});

// POST /:id/send - Mark prescription as sent (WhatsApp/Email)
router.post('/:id/send', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { via } = req.body; // 'whatsapp' or 'email'

    const existing = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const updateData = { sentAt: new Date() };
    if (via === 'whatsapp') updateData.sentViaWhatsApp = true;
    if (via === 'email') updateData.sentViaEmail = true;

    const prescription = await prisma.prescription.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: prescription, message: `Prescription marked as sent via ${via}` });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Delete prescription
router.delete('/:id', checkPermission('prescriptions', 'delete'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    await prisma.prescription.delete({ where: { id } });

    res.json({ success: true, message: 'Prescription deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Common lab tests list (can be moved to database later)
const commonLabTests = [
  { id: 'cbc', name: 'Complete Blood Count (CBC)', category: 'Hematology' },
  { id: 'lft', name: 'Liver Function Test (LFT)', category: 'Biochemistry' },
  { id: 'kft', name: 'Kidney Function Test (KFT)', category: 'Biochemistry' },
  { id: 'lipid', name: 'Lipid Profile', category: 'Biochemistry' },
  { id: 'thyroid', name: 'Thyroid Profile (T3, T4, TSH)', category: 'Hormone' },
  { id: 'hba1c', name: 'HbA1c (Glycated Hemoglobin)', category: 'Diabetes' },
  { id: 'fbs', name: 'Fasting Blood Sugar (FBS)', category: 'Diabetes' },
  { id: 'ppbs', name: 'Post Prandial Blood Sugar (PPBS)', category: 'Diabetes' },
  { id: 'rbs', name: 'Random Blood Sugar (RBS)', category: 'Diabetes' },
  { id: 'urine', name: 'Urine Routine & Microscopy', category: 'Urine' },
  { id: 'stool', name: 'Stool Routine & Microscopy', category: 'Stool' },
  { id: 'esr', name: 'ESR (Erythrocyte Sedimentation Rate)', category: 'Hematology' },
  { id: 'crp', name: 'C-Reactive Protein (CRP)', category: 'Inflammation' },
  { id: 'ecg', name: 'ECG (Electrocardiogram)', category: 'Cardiac' },
  { id: 'xray_chest', name: 'X-Ray Chest PA View', category: 'Radiology' },
  { id: 'usg_abdomen', name: 'USG Abdomen', category: 'Radiology' },
  { id: 'vitamin_d', name: 'Vitamin D (25-OH)', category: 'Vitamins' },
  { id: 'vitamin_b12', name: 'Vitamin B12', category: 'Vitamins' },
  { id: 'iron_studies', name: 'Iron Studies (Serum Iron, TIBC, Ferritin)', category: 'Hematology' },
  { id: 'pt_inr', name: 'PT/INR (Prothrombin Time)', category: 'Coagulation' },
  { id: 'electrolytes', name: 'Serum Electrolytes (Na, K, Cl)', category: 'Biochemistry' },
  { id: 'uric_acid', name: 'Uric Acid', category: 'Biochemistry' },
  { id: 'serum_calcium', name: 'Serum Calcium', category: 'Biochemistry' },
  { id: 'widal', name: 'Widal Test', category: 'Infection' },
  { id: 'dengue', name: 'Dengue NS1 Antigen', category: 'Infection' },
  { id: 'malaria', name: 'Malaria Antigen Test', category: 'Infection' },
  { id: 'covid_rtpcr', name: 'COVID-19 RT-PCR', category: 'Infection' },
  { id: 'psa', name: 'PSA (Prostate Specific Antigen)', category: 'Tumor Markers' },
  { id: 'ra_factor', name: 'RA Factor (Rheumatoid Factor)', category: 'Autoimmune' },
];

// GET /lab-tests/search - Search common lab tests
router.get('/lab-tests/search', authenticate, async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const searchLower = q.toLowerCase();
    
    const results = commonLabTests.filter(test => 
      test.name.toLowerCase().includes(searchLower) || 
      test.category.toLowerCase().includes(searchLower)
    ).slice(0, 10);
    
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;

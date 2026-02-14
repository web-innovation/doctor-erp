import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';
import { logger } from '../config/logger.js';

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

    // Restrict to doctor's own prescriptions by default. Support optional `viewUserId` to view a staff user's prescriptions.
    const viewUserId = req.query.viewUserId;
    if (req.user.role === 'DOCTOR') {
      if (viewUserId) {
        if (viewUserId === req.user.id) {
          where.doctorId = req.user.id;
        } else {
          const staff = await prisma.staff.findFirst({ where: { userId: viewUserId, clinicId: req.user.clinicId } });
          if (!staff) return res.status(404).json({ success: false, message: 'Requested user is not a staff member' });
          const assignment = await prisma.staffAssignment.findUnique({ where: { staffId_doctorId: { staffId: staff.id, doctorId: req.user.id } } }).catch(() => null);
          if (!assignment) return res.status(403).json({ success: false, message: 'Permission denied for requested view' });
          where.doctorId = viewUserId;
        }
      } else {
        where.doctorId = req.user.id;
      }
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

    // Enforce doctor-only access: allow only own prescriptions or explicit `viewUserId` when authorized
    if (req.user.role === 'DOCTOR') {
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
        if (prescription.doctorId && prescription.doctorId !== req.user.id) return res.status(403).json({ success: false, message: 'Permission denied' });
      }
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
        doctorId: req.body.doctorId || (req.user.role === 'DOCTOR' ? req.user.id : undefined),
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
            productId: med.productId || null,
            isExternal: med.isExternal || false
          }))
        },
        labTests: {
          create: labTests.map(test => ({
            testName: test.testName,
            instructions: test.instructions,
            labId: test.labId || null,
            isExternal: test.isExternal || false
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
    const { medicineName, genericName, dosage, frequency, duration, timing, quantity, instructions, productId, isExternal } = req.body;

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
        productId: productId || null,
        isExternal: isExternal || false
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
    const { testName, instructions, labId, isExternal } = req.body;

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
        labId: labId || null,
        isExternal: isExternal || false
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
        where: Object.assign({ patientId, clinicId: req.user.clinicId }, req.user.role === 'DOCTOR' ? { doctorId: req.user.id } : {}),
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

// POST /:id/send - Send prescription via WhatsApp/Email
router.post('/:id/send', checkPermission('prescriptions', 'create'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const via = req.body.via || req.body.method; // Support both 'via' and 'method' parameter names

    const prescription = await prisma.prescription.findFirst({
      where: { id, clinicId: req.user.clinicId },
      include: {
        patient: true,
        medicines: {
          include: { pharmacyProduct: true }
        },
        labTests: true,
        clinic: true
      }
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const updateData = { sentAt: new Date() };
    
    if (via === 'email') {
      // Check if patient has email
      if (!prescription.patient?.email) {
        return res.status(400).json({ success: false, message: 'Patient does not have an email address' });
      }

      // Build medicine list HTML
      const medicineList = prescription.medicines.map((m, idx) => 
        `<tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${m.pharmacyProduct?.name || m.medicineName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${m.dosage || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${m.duration || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${m.instructions || '-'}</td>
        </tr>`
      ).join('');

      // Build lab tests list HTML
      const labTestsList = prescription.labTests?.length > 0 
        ? prescription.labTests.map((test, idx) => 
            `<tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${idx + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${test.testName}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${test.instructions || '-'}</td>
            </tr>`
          ).join('')
        : '';

      // Parse diagnosis
      let diagnosis = '-';
      try {
        const diagArr = JSON.parse(prescription.diagnosis || '[]');
        diagnosis = diagArr.length > 0 ? diagArr.join(', ') : '-';
      } catch {
        diagnosis = prescription.diagnosis || '-';
      }

      // Clinic details
      const clinic = prescription.clinic;
      const clinicAddress = clinic?.address || '';
      const clinicPhone = clinic?.phone || '';
      const clinicEmail = clinic?.email || '';

      // Send email
      await emailService.sendEmail({
        to: prescription.patient.email,
        subject: `Prescription ${prescription.prescriptionNo} - ${prescription.clinic?.name || 'DocClinic'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">${clinic?.name || 'DocClinic'}</h1>
              ${clinicAddress ? `<p style="margin: 5px 0 0 0; font-size: 14px;">${clinicAddress}</p>` : ''}
              ${clinicPhone || clinicEmail ? `<p style="margin: 5px 0 0 0; font-size: 14px;">${clinicPhone ? `📞 ${clinicPhone}` : ''}${clinicPhone && clinicEmail ? ' | ' : ''}${clinicEmail ? `✉️ ${clinicEmail}` : ''}</p>` : ''}
            </div>
            
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Dear <strong>${prescription.patient.name}</strong>,</p>
              <p>Please find your prescription details below:</p>
              
              <table style="width: 100%; margin: 15px 0; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0;"><strong>Prescription No:</strong></td>
                  <td>${prescription.prescriptionNo}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Date:</strong></td>
                  <td>${new Date(prescription.date).toLocaleDateString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0;"><strong>Diagnosis:</strong></td>
                  <td>${diagnosis}</td>
                </tr>
              </table>

              ${prescription.medicines?.length > 0 ? `
              <h3 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Medicines</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">#</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Medicine</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Dosage</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Duration</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  ${medicineList}
                </tbody>
              </table>
              ` : ''}

              ${prescription.labTests?.length > 0 ? `
              <h3 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Lab Tests</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">#</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Test Name</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  ${labTestsList}
                </tbody>
              </table>
              ` : ''}

              ${prescription.advice ? `
                <h3 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">Advice</h3>
                <p>${prescription.advice}</p>
              ` : ''}

              ${prescription.followUpDate ? `
                <p><strong>Follow-up Date:</strong> ${new Date(prescription.followUpDate).toLocaleDateString('en-IN')}</p>
              ` : ''}
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <div style="background: #f9fafb; padding: 15px; border-radius: 5px;">
                <p style="margin: 0; color: #374151; font-weight: bold;">${clinic?.name || 'DocClinic'}</p>
                ${clinicAddress ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">📍 ${clinicAddress}</p>` : ''}
                ${clinicPhone ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">📞 ${clinicPhone}</p>` : ''}
                ${clinicEmail ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">✉️ ${clinicEmail}</p>` : ''}
              </div>
              <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 15px;">
                This is an automated email. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      });

      updateData.sentViaEmail = true;
      logger.info(`Prescription ${prescription.prescriptionNo} sent via email to ${prescription.patient.email}`);
    }
    
    if (via === 'whatsapp') {
      // Check if patient has phone number
      if (!prescription.patient?.phone) {
        return res.status(400).json({ success: false, message: 'Patient does not have a phone number' });
      }

      // Send via WhatsApp service
      const whatsappResult = await whatsappService.sendPrescription(prescription);
      
      updateData.sentViaWhatsApp = true;
      logger.info(`Prescription ${prescription.prescriptionNo} WhatsApp message prepared for ${prescription.patient.phone}`);

      // If URL method, return the URL to frontend
      if (whatsappResult.method === 'url') {
        const updated = await prisma.prescription.update({
          where: { id },
          data: updateData
        });

        return res.json({ 
          success: true, 
          data: updated,
          whatsappUrl: whatsappResult.url,
          method: 'url',
          message: 'Click the link to send prescription via WhatsApp' 
        });
      }
    }

    const updated = await prisma.prescription.update({
      where: { id },
      data: updateData
    });

    res.json({ 
      success: true, 
      data: updated, 
      message: `Prescription sent via ${via}` 
    });
  } catch (error) {
    logger.error('Error sending prescription:', error);
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
    
    // Search server-side lab catalog for clinic and combine with common tests
    const clinicId = req.user.clinicId;
    const labTests = await prisma.labTest.findMany({
      where: {
        clinicId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: { lab: { select: { id: true, name: true } } },
      take: 20
    });

    const results = commonLabTests.filter(test => 
      test.name.toLowerCase().includes(searchLower) || 
      test.category.toLowerCase().includes(searchLower)
    ).slice(0, 10);

    // Map labTests to unified shape and avoid duplicates by name
    const mappedLabTests = labTests.map(t => ({ id: t.id, name: t.name, category: t.category || '', labId: t.labId, labName: t.lab?.name, price: t.price, isCatalog: true }));
    const combined = [...mappedLabTests];
    // Add common tests that are not already present in catalog by name
    results.forEach(ct => {
      if (!combined.some(c => c.name.toLowerCase() === ct.name.toLowerCase())) {
        combined.push({ id: ct.id || null, name: ct.name, category: ct.category || '', labId: null, labName: null, price: null, isCatalog: false });
      }
    });

    res.json({ success: true, data: combined.slice(0, 30) });
  } catch (error) {
    next(error);
  }
});

export default router;

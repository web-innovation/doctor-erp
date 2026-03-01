import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import os from 'os';
import path from 'path';
import XLSX from 'xlsx';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import {
  SUPER_ADMIN_CONTROLS_KEY,
  normalizeAccessControls as normalizeAccessControlsWithSubscription,
  getClinicControls,
  getSubscriptionSnapshot,
  getEffectiveStaffLimit,
} from '../services/subscriptionService.js';

const router = express.Router();

// Super Admin middleware - only SUPER_ADMIN can access these routes
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Super Admin privileges required.' 
    });
  }
  next();
};

router.use(authenticate);
router.use(requireSuperAdmin);

const setupUpload = multer({ storage: multer.memoryStorage() });

const DEFAULT_SUPER_ADMIN_CONTROLS = normalizeAccessControlsWithSubscription({}, new Date());

function parseJsonSafe(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return fallback;
  }
}

const normalizeAccessControls = (value, clinicCreatedAt) =>
  normalizeAccessControlsWithSubscription(value, clinicCreatedAt || new Date());

async function getClinicAccessControls(clinicId) {
  return getClinicControls(clinicId);
}

async function saveClinicAccessControls(clinicId, value) {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { createdAt: true } });
  const controls = normalizeAccessControls(value, clinic?.createdAt || new Date());
  await prisma.clinicSettings.upsert({
    where: { clinicId_key: { clinicId, key: SUPER_ADMIN_CONTROLS_KEY } },
    create: { clinicId, key: SUPER_ADMIN_CONTROLS_KEY, value: JSON.stringify(controls) },
    update: { value: JSON.stringify(controls), updatedAt: new Date() }
  });
  return controls;
}

function parseCsv(text) {
  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(cur.trim());
      cur = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cur.trim());
      cur = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }
  if (cur.length || row.length) {
    row.push(cur.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }
  if (!rows.length) return { headers: [], records: [] };
  const headers = rows[0].map((h, idx) => {
    const base = h.trim();
    return idx === 0 ? base.replace(/^\uFEFF/, '') : base;
  });
  const records = rows.slice(1).map((cols) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] ?? ''; });
    return obj;
  });
  return { headers, records };
}

function normalizeSheetEntity(name) {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[\s-]+/g, '_');
  const map = {
    staff: 'staff',
    staffs: 'staff',
    pharmacy: 'pharmacy',
    pharmacies: 'pharmacy',
    agent: 'agent',
    agents: 'agent',
    lab: 'lab',
    labs: 'lab',
    lab_test: 'lab_test',
    lab_tests: 'lab_test',
    labtest: 'lab_test',
    labtests: 'lab_test',
    lab_testes: 'lab_test'
  };
  return map[normalized] || null;
}

function parseSheetRows(data = []) {
  if (!Array.isArray(data) || data.length === 0) return { headers: [], records: [] };
  const headerRow = data[0] || [];
  const headers = headerRow.map((h) => String(h ?? '').trim());
  const records = data.slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim().length > 0))
    .map((row) => {
      const obj = {};
      headers.forEach((h, idx) => {
        if (!h) return;
        obj[h] = row[idx] ?? '';
      });
      return obj;
    });
  return { headers, records };
}

function parseSetupSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const records = [];
  const sheetSummary = [];
  workbook.SheetNames.forEach((sheetName) => {
    const entity = normalizeSheetEntity(sheetName);
    if (!entity) return;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const parsed = parseSheetRows(data);
    if (!parsed.records.length) return;
    parsed.records.forEach((row) => {
      row.entity = entity;
      records.push(row);
    });
    sheetSummary.push({ sheet: sheetName, entity, rows: parsed.records.length });
  });
  return { records, sheetSummary };
}

function buildSetupTemplateWorkbook() {
  const wb = XLSX.utils.book_new();
  const addSheet = (name, headers, rows) => {
    const data = [headers, ...(rows || [])];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet('Staff', [
    'name', 'email', 'phone', 'role', 'password', 'employeeId', 'department', 'designation', 'joinDate', 'salary'
  ], [
    ['Anita Sharma', 'anita.reception@clinic.com', '9876543201', 'RECEPTIONIST', 'password123', 'EMP-001', 'Front Desk', 'Reception Executive', '2026-01-01', 22000],
    ['Raj Verma', 'raj.pharmacist@clinic.com', '9876543202', 'PHARMACIST', 'password123', 'EMP-002', 'Pharmacy', 'Pharmacist', '2026-01-01', 30000]
  ]);

  addSheet('Pharmacy', [
    'code', 'name', 'genericName', 'category', 'manufacturer', 'mrp', 'purchasePrice', 'sellingPrice', 'gstPercent',
    'quantity', 'minStock', 'unit', 'batchNumber', 'expiryDate', 'rackNumber'
  ], [
    ['MED-001', 'Azithromycin 500', '', 'Antibiotic', 'ABC Pharma', 165, 120, 145, 12, 100, 15, 'pcs', 'B001', '2027-06-30', 'R1-A1'],
    ['MED-002', 'Paracetamol 650', '', 'Analgesic', 'XYZ Pharma', 38, 24, 30, 5, 500, 50, 'pcs', 'B010', '2027-09-30', 'R1-A2']
  ]);

  addSheet('Agents', [
    'name', 'email', 'phone', 'address', 'contactPerson', 'commissionType', 'commissionValue', 'discountAllowed'
  ], [
    ['City Referral Desk', 'referral.agent@sample.com', '9876543299', '12 Park Street', 'Ref Manager', 'PERCENTAGE', 10, 5]
  ]);

  addSheet('Labs', [
    'name', 'email', 'phone', 'address', 'contactPerson', 'commissionType', 'commissionValue'
  ], [
    ['Prime Diagnostics', 'support@primediag.com', '9123456780', '19 MG Road', 'Dr. Kunal', 'PERCENTAGE', 20]
  ]);

  addSheet('Lab Tests', [
    'labName', 'testCode', 'testName', 'testCategory', 'testPrice', 'currency', 'description'
  ], [
    ['Prime Diagnostics', 'CBC', 'CBC', 'Pathology', 350, 'INR', 'Complete blood count'],
    ['Prime Diagnostics', 'LFT', 'Liver Function Test', 'Biochemistry', 900, 'INR', 'Liver function profile']
  ]);

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function csvNum(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function csvDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function cleanString(v) {
  const s = String(v || '').trim();
  return s || null;
}

// =============================================
// CLINICS MANAGEMENT
// =============================================

// GET /clinics - List all clinics with stats
router.get('/clinics', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [clinics, total] = await Promise.all([
      prisma.clinic.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            where: { role: { in: ['DOCTOR', 'ADMIN'] } },
            orderBy: [
              { role: 'asc' },
              { createdAt: 'asc' }
            ],
            take: 1,
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              users: true,
              patients: true,
              appointments: true,
              bills: true
            }
          }
        }
      }),
      prisma.clinic.count({ where })
    ]);

    const clinicIds = clinics.map((c) => c.id);
    const controlsRows = clinicIds.length ? await prisma.clinicSettings.findMany({
      where: { clinicId: { in: clinicIds }, key: SUPER_ADMIN_CONTROLS_KEY },
      select: { clinicId: true, value: true }
    }) : [];
    const controlsByClinicId = new Map(
      controlsRows.map((r) => [r.clinicId, normalizeAccessControls(parseJsonSafe(r.value, DEFAULT_SUPER_ADMIN_CONTROLS))])
    );

    // Add owner info to each clinic
    const clinicsWithOwner = clinics.map(clinic => ({
      ...clinic,
      owner: clinic.users?.[0] || null,
      accessControls: controlsByClinicId.get(clinic.id) || DEFAULT_SUPER_ADMIN_CONTROLS,
      users: undefined // Remove users array, keep _count
    }));

    res.json({
      success: true,
      data: clinicsWithOwner,
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

// GET /clinics/:id - Get single clinic with full details
router.get('/clinics/:id', async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: req.params.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            lastLogin: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            patients: true,
            appointments: true,
            bills: true,
            pharmacy: true,
            staff: true
          }
        }
      }
    });

    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // Get revenue summary
    const [revenueSummary, accessControls] = await Promise.all([
      prisma.bill.aggregate({
        where: { clinicId: clinic.id },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      getClinicAccessControls(clinic.id)
    ]);

    res.json({
      success: true,
      data: {
        ...clinic,
        accessControls,
        stats: {
          totalPatients: clinic._count.patients,
          totalAppointments: clinic._count.appointments,
          totalBills: clinic._count.bills,
          totalProducts: clinic._count.pharmacy,
          totalStaff: clinic._count.staff,
          totalRevenue: revenueSummary._sum.totalAmount || 0,
          totalCollected: revenueSummary._sum.paidAmount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /clinics/:id/access-controls - per clinic super-admin controls
router.get('/clinics/:id/access-controls', async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    const data = await getClinicAccessControls(clinic.id);
    res.json({ success: true, data: { ...data, subscriptionSnapshot: getSubscriptionSnapshot(data) } });
  } catch (error) {
    next(error);
  }
});

// PUT /clinics/:id/access-controls - update clinic controls
router.put('/clinics/:id/access-controls', async (req, res, next) => {
  try {
    const clinic = await prisma.clinic.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });
    const controls = await saveClinicAccessControls(clinic.id, req.body || {});
    res.json({
      success: true,
      data: { ...controls, subscriptionSnapshot: getSubscriptionSnapshot(controls) },
      message: 'Access controls updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /clinic-setup/template - downloadable CSV template
router.get('/clinic-setup/template', async (_req, res, next) => {
  try {
    const buffer = buildSetupTemplateWorkbook();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="clinic_setup_template.xlsx"');
    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
});

// POST /clinics/:id/setup-import?dryRun=true - one-click clinic setup from CSV
router.post('/clinics/:id/setup-import', setupUpload.single('file'), async (req, res, next) => {
  try {
    const clinicId = req.params.id;
    const dryRun = String(req.query.dryRun || '').toLowerCase() === 'true';
    if (!req.file) return res.status(400).json({ success: false, message: 'CSV file is required' });

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
    if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });

    const ext = path.extname(req.file.originalname || '').toLowerCase();
    const mime = String(req.file.mimetype || '').toLowerCase();
    const isXlsx = ext === '.xlsx' || mime.includes('spreadsheetml.sheet');
    let records = [];
    if (isXlsx) {
      const parsed = parseSetupSpreadsheet(req.file.buffer);
      records = parsed.records;
      if (!records.length) return res.status(400).json({ success: false, message: 'Spreadsheet is empty or has no supported sheets' });
    } else {
      const csvText = req.file.buffer.toString('utf8');
      const { headers, records: csvRecords } = parseCsv(csvText);
      if (!headers.length || !csvRecords.length) return res.status(400).json({ success: false, message: 'CSV file is empty' });
      if (!headers.includes('entity')) return res.status(400).json({ success: false, message: 'CSV must contain `entity` column' });
      records = csvRecords;
    }

    const summary = {
      rows: records.length,
      staff: { created: 0, updated: 0, skipped: 0 },
      pharmacy: { created: 0, updated: 0, skipped: 0 },
      labs: { created: 0, updated: 0, skipped: 0 },
      labTests: { created: 0, updated: 0, skipped: 0 },
      agents: { created: 0, updated: 0, skipped: 0 },
      errors: []
    };

    const run = async (tx) => {
      const labCache = new Map();

      for (let idx = 0; idx < records.length; idx += 1) {
        const lineNo = idx + 2;
        const row = records[idx];
        const entity = String(row.entity || '').trim().toLowerCase();

        try {
          if (entity === 'staff') {
            const email = cleanString(row.email);
            const name = cleanString(row.name);
            if (!email || !name) {
              summary.staff.skipped += 1;
              continue;
            }
            const role = cleanString(row.role) || 'STAFF';
            const existingUser = await tx.user.findFirst({ where: { email } });
            let user = existingUser;
            if (!existingUser) {
              if (dryRun) {
                summary.staff.created += 1;
                continue;
              }
              const hashed = await bcrypt.hash(cleanString(row.password) || 'password123', 10);
              user = await tx.user.create({
                data: {
                  email,
                  name,
                  phone: cleanString(row.phone),
                  role,
                  password: hashed,
                  clinicId
                }
              });
            } else if (!dryRun && existingUser.clinicId !== clinicId) {
              summary.errors.push(`Line ${lineNo}: user ${email} belongs to a different clinic`);
              summary.staff.skipped += 1;
              continue;
            } else if (!dryRun && (existingUser.name !== name || existingUser.role !== role)) {
              user = await tx.user.update({
                where: { id: existingUser.id },
                data: { name, role, phone: cleanString(row.phone) || existingUser.phone }
              });
            }

            const existingStaff = await tx.staff.findUnique({ where: { userId: user.id } });
            if (!existingStaff) {
              if (dryRun) {
                summary.staff.created += existingUser ? 0 : 1;
              } else {
                await tx.staff.create({
                  data: {
                    userId: user.id,
                    clinicId,
                    employeeId: cleanString(row.employeeId) || `EMP-${Date.now()}-${idx}`,
                    department: cleanString(row.department),
                    designation: cleanString(row.designation),
                    joinDate: csvDate(row.joinDate) || new Date(),
                    salary: csvNum(row.salary, 0)
                  }
                });
                summary.staff.created += existingUser ? 0 : 1;
              }
            } else {
              summary.staff.updated += 1;
            }
            continue;
          }

          if (entity === 'pharmacy') {
            const code = cleanString(row.code);
            const name = cleanString(row.name);
            const category = cleanString(row.category) || 'General';
            if (!code || !name) {
              summary.pharmacy.skipped += 1;
              continue;
            }
            const existing = await tx.pharmacyProduct.findUnique({ where: { clinicId_code: { clinicId, code } } });
            if (dryRun) {
              existing ? (summary.pharmacy.updated += 1) : (summary.pharmacy.created += 1);
              continue;
            }
            if (existing) {
              await tx.pharmacyProduct.update({
                where: { id: existing.id },
                data: {
                  name,
                  category,
                  manufacturer: cleanString(row.manufacturer),
                  mrp: csvNum(row.mrp, existing.mrp || 0),
                  purchasePrice: csvNum(row.purchasePrice, existing.purchasePrice || 0),
                  sellingPrice: csvNum(row.sellingPrice, existing.sellingPrice || 0),
                  gstPercent: csvNum(row.gstPercent, existing.gstPercent || 12),
                  quantity: csvNum(row.quantity, existing.quantity || 0),
                  minStock: csvNum(row.minStock, existing.minStock || 10),
                  unit: cleanString(row.unit) || existing.unit || 'pcs',
                  batchNumber: cleanString(row.batchNumber),
                  expiryDate: csvDate(row.expiryDate),
                  rackNumber: cleanString(row.rackNumber)
                }
              });
              summary.pharmacy.updated += 1;
            } else {
              await tx.pharmacyProduct.create({
                data: {
                  clinicId,
                  code,
                  name,
                  genericName: cleanString(row.genericName),
                  manufacturer: cleanString(row.manufacturer),
                  category,
                  mrp: csvNum(row.mrp, 0),
                  purchasePrice: csvNum(row.purchasePrice, 0),
                  sellingPrice: csvNum(row.sellingPrice, 0),
                  gstPercent: csvNum(row.gstPercent, 12),
                  quantity: csvNum(row.quantity, 0),
                  minStock: csvNum(row.minStock, 10),
                  unit: cleanString(row.unit) || 'pcs',
                  batchNumber: cleanString(row.batchNumber),
                  expiryDate: csvDate(row.expiryDate),
                  rackNumber: cleanString(row.rackNumber)
                }
              });
              summary.pharmacy.created += 1;
            }
            continue;
          }

          if (entity === 'agent') {
            const name = cleanString(row.name);
            const phone = cleanString(row.phone);
            if (!name || !phone) {
              summary.agents.skipped += 1;
              continue;
            }
            const existing = await tx.agent.findFirst({ where: { clinicId, phone } });
            if (dryRun) {
              existing ? (summary.agents.updated += 1) : (summary.agents.created += 1);
              continue;
            }
            if (existing) {
              await tx.agent.update({
                where: { id: existing.id },
                data: {
                  name,
                  email: cleanString(row.email),
                  address: cleanString(row.address),
                  commissionType: cleanString(row.commissionType) || existing.commissionType || 'PERCENTAGE',
                  commissionValue: csvNum(row.commissionValue, existing.commissionValue || 0),
                  discountAllowed: csvNum(row.discountAllowed, existing.discountAllowed || 0),
                  isActive: true
                }
              });
              summary.agents.updated += 1;
            } else {
              await tx.agent.create({
                data: {
                  clinicId,
                  name,
                  phone,
                  email: cleanString(row.email),
                  address: cleanString(row.address),
                  commissionType: cleanString(row.commissionType) || 'PERCENTAGE',
                  commissionValue: csvNum(row.commissionValue, 0),
                  discountAllowed: csvNum(row.discountAllowed, 0),
                  isActive: true
                }
              });
              summary.agents.created += 1;
            }
            continue;
          }

          if (entity === 'lab') {
            const name = cleanString(row.name);
            if (!name) {
              summary.labs.skipped += 1;
              continue;
            }
            const existing = await tx.lab.findFirst({ where: { clinicId, name } });
            if (dryRun) {
              existing ? (summary.labs.updated += 1) : (summary.labs.created += 1);
              continue;
            }
            const payload = {
              clinicId,
              name,
              address: cleanString(row.address),
              phone: cleanString(row.phone),
              email: cleanString(row.email),
              contactPerson: cleanString(row.contactPerson),
              commissionType: cleanString(row.commissionType) || 'PERCENTAGE',
              commissionValue: csvNum(row.commissionValue, 0),
              isActive: true
            };
            const saved = existing
              ? await tx.lab.update({ where: { id: existing.id }, data: payload })
              : await tx.lab.create({ data: payload });
            if (existing) summary.labs.updated += 1;
            else summary.labs.created += 1;
            labCache.set(saved.name.toLowerCase(), saved);
            continue;
          }

          if (entity === 'lab_test') {
            const labName = cleanString(row.labName);
            const testName = cleanString(row.testName) || cleanString(row.name);
            if (!labName || !testName) {
              summary.labTests.skipped += 1;
              continue;
            }
            const labKey = labName.toLowerCase();
            let lab = labCache.get(labKey) || null;
            if (!lab) {
              lab = await tx.lab.findFirst({ where: { clinicId, name: labName } });
              if (lab) labCache.set(labKey, lab);
            }
            if (!lab) {
              summary.errors.push(`Line ${lineNo}: lab "${labName}" not found for lab_test`);
              summary.labTests.skipped += 1;
              continue;
            }
            const code = cleanString(row.testCode) || cleanString(row.code);
            const where = code
              ? { labId_code: { labId: lab.id, code } }
              : null;
            const existing = code
              ? await tx.labTest.findUnique({ where })
              : await tx.labTest.findFirst({ where: { clinicId, labId: lab.id, name: testName } });

            if (dryRun) {
              existing ? (summary.labTests.updated += 1) : (summary.labTests.created += 1);
              continue;
            }
            const payload = {
              clinicId,
              labId: lab.id,
              code,
              name: testName,
              category: cleanString(row.testCategory) || cleanString(row.category),
              description: cleanString(row.description),
              price: csvNum(row.testPrice || row.price, 0),
              currency: cleanString(row.currency) || 'INR',
              isActive: true
            };
            if (existing) {
              await tx.labTest.update({ where: { id: existing.id }, data: payload });
              summary.labTests.updated += 1;
            } else {
              await tx.labTest.create({ data: payload });
              summary.labTests.created += 1;
            }
            continue;
          }

          summary.errors.push(`Line ${lineNo}: unknown entity "${entity}"`);
        } catch (rowErr) {
          summary.errors.push(`Line ${lineNo}: ${rowErr?.message || rowErr}`);
        }
      }
    };

    if (!dryRun) {
      await prisma.$transaction((tx) => run(tx));
    } else {
      await run(prisma);
    }

    res.json({
      success: true,
      data: {
        dryRun,
        summary
      },
      message: dryRun ? 'Dry run completed' : 'Clinic setup import completed'
    });
  } catch (error) {
    next(error);
  }
});

// POST /clinics - Create new clinic with owner
router.post('/clinics', async (req, res, next) => {
  try {
    const {
      // Clinic info
      name,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      gstNumber,
      licenseNumber,
      // Owner info
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerPassword
    } = req.body;

    // Validate required fields
    if (!name || !ownerName || !ownerEmail || !ownerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Clinic name, owner name, email and phone are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: ownerEmail }, { phone: ownerPhone }] }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(ownerPassword || 'password123', 10);

    // Create clinic and owner in transaction
    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name,
          address: address || '',
          city: city || '',
          state: state || '',
          pincode: pincode || '',
          phone: phone || ownerPhone,
          email: email || ownerEmail,
          gstNumber,
          licenseNumber,
          isActive: true
        }
      });

      const owner = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone,
          password: hashedPassword,
          role: 'ADMIN',
          clinicId: clinic.id
        }
      });

      return { clinic, owner };
    });

    res.status(201).json({
      success: true,
      data: {
        clinic: result.clinic,
        owner: {
          id: result.owner.id,
          name: result.owner.name,
          email: result.owner.email,
          phone: result.owner.phone,
          role: result.owner.role
        }
      },
      message: 'Clinic created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /clinics/:id - Update clinic
router.put('/clinics/:id', async (req, res, next) => {
  try {
    const { name, address, city, state, pincode, phone, email, gstNumber, licenseNumber, isActive } = req.body;

    const clinic = await prisma.clinic.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        gstNumber,
        licenseNumber
      }
    });

    res.json({ success: true, data: clinic, message: 'Clinic updated successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    next(error);
  }
});

// PUT /clinics/:id/document-ai - Enable/disable Document AI for a clinic and set config
router.put('/clinics/:id/document-ai', async (req, res, next) => {
  try {
    const { enabled, config } = req.body; // config is an object
    const updateData = {};
    if (typeof enabled !== 'undefined') updateData.documentAiEnabled = Boolean(enabled);
    if (typeof config !== 'undefined') updateData.documentAiConfig = config ? JSON.stringify(config) : null;

    const clinic = await prisma.clinic.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: { id: clinic.id, documentAiEnabled: clinic.documentAiEnabled, documentAiConfig: clinic.documentAiConfig ? JSON.parse(clinic.documentAiConfig) : null } });
  } catch (error) {
    next(error);
  }
});

// GET /document-ai/usage/:clinicId - Get Document AI usage summary for a clinic
router.get('/document-ai/usage/:clinicId', async (req, res, next) => {
  try {
    const clinicId = req.params.clinicId;
    const usages = await prisma.documentAiUsage.findMany({ where: { clinicId }, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ success: true, data: usages });
  } catch (error) {
    next(error);
  }
});

// DELETE /clinics/:id - Soft delete (deactivate all users)
router.delete('/clinics/:id', async (req, res, next) => {
  try {
    // Deactivate all users in the clinic
    await prisma.user.updateMany({
      where: { clinicId: req.params.id },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Clinic deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /clinics/:id/activate - Reactivate clinic
router.post('/clinics/:id/activate', async (req, res, next) => {
  try {
    await prisma.user.updateMany({
      where: { clinicId: req.params.id },
      data: { isActive: true }
    });

    res.json({ success: true, message: 'Clinic activated successfully' });
  } catch (error) {
    next(error);
  }
});

// =============================================
// USERS MANAGEMENT (across all clinics)
// =============================================

// GET /users - List all users across clinics
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, clinicId, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = { role: { not: 'SUPER_ADMIN' } }; // Don't list super admins
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role;
    if (clinicId) where.clinicId = clinicId;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          clinic: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: users,
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

// POST /users/:id/toggle-status - Activate/deactivate user
router.post('/users/:id/toggle-status', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive }
    });

    res.json({
      success: true,
      data: { isActive: updated.isActive },
      message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// POST /users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const password = newPassword || 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      tempPassword: newPassword ? undefined : 'password123'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    next(error);
  }
});

// =============================================
// DASHBOARD & ANALYTICS
// =============================================

// GET /dashboard - Super admin dashboard stats
router.get('/dashboard', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const [
      totalClinics,
      activeClinics,
      totalUsers,
      totalPatients,
      activeUsers,
      todayAppointments,
      monthlyRevenue,
      lastMonthRevenue,
      recentClinics,
      newClinicsThisMonth,
      newClinicsLastMonth,
      newUsersThisMonth,
      newPatientsThisMonth,
      failedUploads24h,
      draftPurchasesCount
    ] = await Promise.all([
      prisma.clinic.count(),
      prisma.clinic.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      prisma.patient.count(),
      prisma.user.count({ where: { isActive: true, role: { not: 'SUPER_ADMIN' } } }),
      prisma.appointment.count({ where: { date: { gte: today, lt: tomorrow } } }),
      prisma.bill.aggregate({
        where: { createdAt: { gte: thisMonth } },
        _sum: { totalAmount: true }
      }),
      prisma.bill.aggregate({
        where: { createdAt: { gte: lastMonth, lt: thisMonth } },
        _sum: { totalAmount: true }
      }),
      prisma.clinic.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          users: {
            where: { role: { in: ['DOCTOR', 'ADMIN'] } },
            orderBy: [
              { role: 'asc' },
              { createdAt: 'asc' }
            ],
            take: 1,
            select: { id: true, name: true, email: true }
          },
          _count: { select: { users: true, patients: true } }
        }
      }),
      prisma.clinic.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.clinic.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth }, role: { not: 'SUPER_ADMIN' } } }),
      prisma.patient.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.purchaseUpload.count({
        where: { status: 'FAILED', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      prisma.purchase.count({ where: { status: 'DRAFT' } })
    ]);

    // Get monthly growth data for charts (last 6 months) as per-month deltas
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

      const [clinicsCount, usersCount, patientsCount, revenueSum] = await Promise.all([
        prisma.clinic.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
        prisma.user.count({ where: { createdAt: { gte: monthStart, lt: monthEnd }, role: { not: 'SUPER_ADMIN' } } }),
        prisma.patient.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
        prisma.bill.aggregate({
          where: { createdAt: { gte: monthStart, lt: monthEnd } },
          _sum: { totalAmount: true }
        })
      ]);

      monthlyGrowth.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        clinics: clinicsCount,
        users: usersCount,
        patients: patientsCount,
        revenue: revenueSum._sum.totalAmount || 0
      });
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalClinics,
          activeClinics,
          inactiveClinics: totalClinics - activeClinics,
          totalUsers,
          totalPatients,
          activeUsers,
          todayAppointments,
          monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
          lastMonthRevenue: lastMonthRevenue._sum.totalAmount || 0,
          newClinicsThisMonth,
          newClinicsLastMonth,
          newUsersThisMonth,
          newPatientsThisMonth,
          failedUploads24h,
          draftPurchasesCount
        },
        infrastructure: {
          instanceUptimeSec: Math.floor(process.uptime()),
          memoryUsedMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          memoryTotalMb: Math.round(os.totalmem() / (1024 * 1024)),
          loadAvg1m: os.loadavg?.()[0] || 0,
          platform: `${os.platform()} ${os.release()}`,
          awsCriticalAlerts: failedUploads24h > 0 ? failedUploads24h : 0
        },
        monthlyGrowth,
        recentClinics: recentClinics.map(c => ({
          id: c.id,
          name: c.name,
          city: c.city,
          createdAt: c.createdAt,
          isActive: c.isActive,
          owner: c.users?.[0] || null,
          usersCount: c._count.users,
          patientsCount: c._count.patients
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// CLINIC STAFF MANAGEMENT
// =============================================

// POST /clinics/:id/staff - Add staff member to clinic
router.post('/clinics/:id/staff', async (req, res, next) => {
  try {
    const { name, email, phone, role, password } = req.body;
    const clinicId = req.params.id;

    // Validate required fields
    if (!name || !email || !phone || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone and role are required'
      });
    }

    // Check if clinic exists
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    const accessControls = await getClinicAccessControls(clinicId);
    const subscriptionSnapshot = getSubscriptionSnapshot(accessControls);
    if (subscriptionSnapshot.isReadOnly) {
      return res.status(403).json({
        success: false,
        message: 'Subscription expired. Clinic is in read-only mode.'
      });
    }
    const staffLimit = getEffectiveStaffLimit(accessControls);
    if (staffLimit) {
      const activeStaffUsers = await prisma.user.count({
        where: {
          clinicId,
          role: { not: 'SUPER_ADMIN' }
        }
      });
      if (activeStaffUsers >= staffLimit) {
        return res.status(400).json({
          success: false,
          message: `Staff limit reached for clinic (${staffLimit})`
        });
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role,
        clinicId
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: user,
      message: 'Staff member added successfully',
      tempPassword: password ? undefined : 'password123'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /clinics/:id/staff/:userId - Remove staff member from clinic
router.delete('/clinics/:id/staff/:userId', async (req, res, next) => {
  try {
    const { id: clinicId, userId } = req.params;

    // Verify user belongs to this clinic
    const user = await prisma.user.findFirst({
      where: { id: userId, clinicId }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found in this clinic' 
      });
    }

    // Soft delete - deactivate the user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Staff member removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /clinics/:id/block - Block/suspend clinic
router.post('/clinics/:id/block', async (req, res, next) => {
  try {
    const clinicId = req.params.id;

    // Update clinic status
    await prisma.clinic.update({
      where: { id: clinicId },
      data: { isActive: false }
    });

    // Deactivate all users in the clinic
    await prisma.user.updateMany({
      where: { clinicId },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Clinic blocked successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    next(error);
  }
});

// POST /clinics/:id/unblock - Unblock/resume clinic
router.post('/clinics/:id/unblock', async (req, res, next) => {
  try {
    const clinicId = req.params.id;

    // Update clinic status
    await prisma.clinic.update({
      where: { id: clinicId },
      data: { isActive: true }
    });

    // Reactivate all users in the clinic
    await prisma.user.updateMany({
      where: { clinicId },
      data: { isActive: true }
    });

    res.json({ success: true, message: 'Clinic unblocked successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }
    next(error);
  }
});

export default router;

import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// Bill types enum
const BILL_TYPES = ['CONSULTATION', 'PHARMACY', 'LAB_TEST', 'PROCEDURE', 'MIXED'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'INSURANCE'];

// Helper: Calculate GST
const calculateTax = (amount, taxConfig) => {
  // Default to 0% GST if not specified (user can select GST rate)
  const gstRate = taxConfig?.gstRate ?? 0;
  const isInterState = taxConfig?.isInterState || false;
  
  if (isInterState) {
    return {
      igst: (amount * gstRate) / 100,
      cgst: 0,
      sgst: 0,
      totalTax: (amount * gstRate) / 100
    };
  }
  
  // Split GST into CGST and SGST (each half of total GST)
  const halfRate = gstRate / 2;
  return {
    igst: 0,
    cgst: (amount * halfRate) / 100,
    sgst: (amount * halfRate) / 100,
    totalTax: (amount * gstRate) / 100
  };
};

// Helper: Generate bill number
const generateBillNo = async () => {
  const today = new Date();
  const prefix = `BILL-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const lastBill = await prisma.bill.findFirst({
    where: { billNo: { startsWith: prefix } },
    orderBy: { billNo: 'desc' }
  });
  
  const sequence = lastBill 
    ? parseInt(lastBill.billNo.split('-').pop()) + 1 
    : 1;
  
  return `${prefix}-${String(sequence).padStart(5, '0')}`;
};

// GET / - List bills with filters
router.get('/', authenticate, checkPermission('billing:read'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      startDate, 
      endDate,
      patientId,
      search 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { clinicId: req.user.clinicId };
    
    if (status) where.paymentStatus = status;
    if (type) where.type = type;
    if (patientId === 'me') {
      const userPhoneRaw = req.user?.phone || '';
      const digits = String(userPhoneRaw).replace(/\D/g, '');
      const last10 = digits.slice(-10);
      const candidates = new Set();
      if (userPhoneRaw) candidates.add(userPhoneRaw);
      if (digits) candidates.add(digits);
      if (last10) candidates.add(last10);
      if (last10 && !last10.startsWith('91')) candidates.add('91' + last10);
      const phoneCandidates = Array.from(candidates);

      const orClauses = [];
      phoneCandidates.forEach((p) => orClauses.push({ phone: p }));
      if (req.user?.email) orClauses.push({ email: req.user.email });

      const linkedPatient = await prisma.patient.findFirst({ where: { clinicId: req.user.clinicId, OR: orClauses } });
      logger.info(`[Billing] Resolving patientId=me for user=${req.user.id} phoneCandidates=${JSON.stringify(phoneCandidates)} foundPatient=${linkedPatient?.id || null}`);
      try {
        console.log('[Billing DEBUG] user:', { id: req.user.id, phone: req.user.phone, email: req.user.email });
        console.log('[Billing DEBUG] phoneCandidates:', phoneCandidates);
        console.log('[Billing DEBUG] linkedPatient:', linkedPatient ? { id: linkedPatient.id, patientId: linkedPatient.patientId, phone: linkedPatient.phone, email: linkedPatient.email } : null);
      } catch (e) {}

      if (linkedPatient) {
        where.patientId = linkedPatient.id;
      } else {
        return res.json({ success: true, data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
      }
    } else if (patientId) {
      if (typeof patientId === 'string' && patientId.startsWith('P-')) {
        const p = await prisma.patient.findFirst({ where: { patientId: patientId, clinicId: req.user.clinicId } });
        if (p) where.patientId = p.id;
        else where.patientId = patientId;
      } else {
        where.patientId = patientId;
      }
    }

    // Billing should show clinic-wide bills (doctors share billing area).
    // Do not restrict listing to a single doctor's bills here; server-side control
    // ensures billing is a shared area. Individual bill `doctorId` is still
    // respected when present, and bill creation defaults to the requesting
    // doctor when applicable.
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    
    if (search) {
      where.OR = [
        { billNo: { contains: search } },
        { patient: { name: { contains: search } } }
      ];
    }
    
    // Debug: dump incoming query and resolved filters to help mobile lookups
    try {
      console.log('[Billing DEBUG] request user:', { id: req.user.id, phone: req.user.phone, email: req.user.email });
      console.log('[Billing DEBUG] query params:', req.query);
      console.log('[Billing DEBUG] resolved where before query:', JSON.stringify(where));
    } catch (e) {}

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          items: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bill.count({ where })
    ]);
    try {
      console.log(`[Billing DEBUG] fetched ${bills.length} bills, total=${total}`);
      // print first 3 bills for inspection
      console.log('[Billing DEBUG] sample bills:', bills.slice(0,3).map(b => ({ id: b.id, billNo: b.billNo, patientId: b.patientId, total: b.total || b.amount })));
    } catch (e) {}

    // Provide compatibility aliases for frontend: `total`, `amount`, `paid`, `due`
    const billsMapped = bills.map(b => ({
      ...b,
      total: b.totalAmount,
      amount: b.totalAmount,
      paid: b.paidAmount,
      due: b.dueAmount
    }));

    res.json({
      success: true,
      data: billsMapped,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listing bills:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bills', error: error.message });
  }
});

// GET /patients - List patients for billing (clinic-wide). Guarded by billing:create
router.get('/patients', authenticate, checkPermission('billing:create'), async (req, res) => {
  try {
    const { search, page = 1, limit = 50, doctorId, allDoctors } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = { clinicId: req.user.clinicId };
    // Support explicit allDoctors=true to return clinic-wide patients even if doctorId omitted.
    const wantAllDoctors = (allDoctors || '').toString().toLowerCase() === 'true';
    // Only allow `allDoctors=true` for clinic admins or roles with broader billing access
    if (wantAllDoctors) {
      const userRole = (req.user.role || '').toString().toUpperCase();
      const isAdminLike = req.user.isClinicAdmin || userRole === 'SUPER_ADMIN' || userRole === 'ACCOUNTANT';
      if (!isAdminLike) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions to list patients for all doctors' });
      }
    }
    // If doctorId provided and allDoctors is not true, validate and restrict to that doctor's patients
    if (!wantAllDoctors && doctorId) {
      const candidate = await prisma.user.findUnique({ where: { id: doctorId }, include: { staffProfile: true } });
      if (!candidate || candidate.clinicId !== req.user.clinicId) {
        return res.status(400).json({ success: false, message: 'Invalid doctor selected' });
      }
      const isDoctorRole = (candidate.role || '').toString().toUpperCase() === 'DOCTOR';
      const isStaffDoctor = candidate.staffProfile && candidate.staffProfile.designation && candidate.staffProfile.designation.toLowerCase().includes('doctor');
      if (!isDoctorRole && !isStaffDoctor) {
        return res.status(400).json({ success: false, message: 'Selected user is not a doctor' });
      }
      where.primaryDoctorId = doctorId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { patientId: { contains: search } }
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          patientId: true,
          name: true,
          phone: true,
          primaryDoctor: { select: { id: true, name: true } }
        }
      }),
      prisma.patient.count({ where })
    ]);

    res.json({ success: true, data: patients, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('Error listing billing patients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patients', error: error.message });
  }
});

// GET /doctors - List clinic doctors for billing dropdown
router.get('/doctors', authenticate, checkPermission('billing:create'), async (req, res) => {
  try {
    const clinicId = req.user.clinicId;
    // Users with role DOCTOR
    const usersDoctors = await prisma.user.findMany({
      where: { clinicId, role: 'DOCTOR' },
      select: { id: true, name: true, email: true }
    });

    // Staff records — fetch by clinic and filter designation in JS to avoid unsupported `mode` option
    const rawStaff = await prisma.staff.findMany({
      where: { clinicId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    const staffDoctors = rawStaff.filter(s => s.designation && s.designation.toLowerCase().includes('doctor'));

    const map = new Map();
    usersDoctors.forEach(u => map.set(u.id, { id: u.id, name: u.name, email: u.email }));
    staffDoctors.forEach(s => {
      if (s.user) map.set(s.user.id, { id: s.user.id, name: s.user.name, email: s.user.email });
    });

    const doctors = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('Error listing clinic doctors for billing:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors', error: error.message });
  }
});

// POST / - Create bill with items
router.post('/', authenticate, checkPermission('billing:create'), async (req, res) => {
  try {
    const { 
      patientId, 
      type, 
      items, 
      discount = 0, 
      discountType = 'AMOUNT',
      notes,
      taxConfig,
      labId
    } = req.body;
    
    // Validation
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required' });
    }
    
    if (!type || !BILL_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid bill type. Must be one of: ${BILL_TYPES.join(', ')}` });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }
    
    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;
      return {
        ...item,
        amount: itemTotal
      };
    });
    
    // Calculate discount
    let discountAmount = discount;
    let discountPercent = null;
    if (discountType === 'PERCENTAGE') {
      discountPercent = discount;
      discountAmount = (subtotal * discount) / 100;
    }
    
    const taxableAmount = subtotal - discountAmount;
    
    // Calculate tax
    const tax = calculateTax(taxableAmount, taxConfig);
    const totalAmount = taxableAmount + tax.totalTax;
    
    // Generate bill number
    const billNo = await generateBillNo();
    
    // If a doctorId is provided, validate it belongs to this clinic and represents a doctor
    if (req.body.doctorId) {
      const candidate = await prisma.user.findUnique({ where: { id: req.body.doctorId }, include: { staffProfile: true } });
      if (!candidate || candidate.clinicId !== req.user.clinicId) {
        return res.status(400).json({ success: false, message: 'Invalid doctor selected' });
      }
      const isDoctorRole = (candidate.role || '').toString().toUpperCase() === 'DOCTOR';
      const isStaffDoctor = candidate.staffProfile && candidate.staffProfile.designation && candidate.staffProfile.designation.toLowerCase().includes('doctor');
      if (!isDoctorRole && !isStaffDoctor) {
        return res.status(400).json({ success: false, message: 'Selected user is not a doctor' });
      }
    }

    // Create bill with items
    const bill = await prisma.bill.create({
      data: {
        billNo,
        clinicId: req.user.clinicId,
        doctorId: req.body.doctorId || ((req.user.effectiveRole || '').toString().toUpperCase() === 'DOCTOR' ? req.user.id : undefined),
        labId: labId || null,
        patientId,
        type,
        subtotal,
        discountPercent,
        discountAmount,
        taxAmount: tax.totalTax,
        taxBreakdown: JSON.stringify({ cgst: tax.cgst, sgst: tax.sgst, igst: tax.igst }),
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        paymentStatus: 'PENDING',
        notes,
        items: {
          create: processedItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstPercent: item.gstPercent || 0,
            amount: item.amount,
            productId: item.productId || null,
            labId: item.labId || null,
            labTestId: item.labTestId || null,
            doctorId: item.doctorId || null
          }))
        }
      },
      include: {
        patient: { select: { id: true, name: true, phone: true, primaryDoctor: { select: { id: true, name: true } } } },
        items: true,
        doctor: { select: { id: true, name: true } }
      }
    });
    
    // Handle immediate payment if provided
    if (req.body.payment && req.body.payment.amount > 0) {
      const paymentAmount = Math.min(req.body.payment.amount, bill.totalAmount);
      const method = req.body.payment.method?.toUpperCase() || 'CASH';
      
      await prisma.payment.create({
        data: {
          billId: bill.id,
          clinicId: req.user.clinicId,
          amount: paymentAmount,
          method: PAYMENT_METHODS.includes(method) ? method : 'CASH',
          reference: req.body.payment.reference || null
        }
      });
      
      const newPaidAmount = paymentAmount;
      const newDueAmount = bill.totalAmount - newPaidAmount;
      const newStatus = newDueAmount <= 0 ? 'PAID' : 'PARTIAL';
      
      const updatedBill = await prisma.bill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus: newStatus,
          paymentMethod: method
        },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          items: true,
          payments: true
        }
      });
      
      return res.status(201).json({ success: true, data: updatedBill, message: 'Bill created with payment recorded' });
    }
    
    res.status(201).json({ success: true, data: bill, message: 'Bill created successfully' });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ success: false, message: 'Failed to create bill', error: error.message });
  }
});

// GET /summary - Daily/monthly summary
router.get('/summary', authenticate, checkPermission('billing:read'), async (req, res) => {
  try {
    const { period = 'daily', date } = req.query;
    
    const targetDate = date ? new Date(date) : new Date();
    let startDate, endDate;
    
    if (period === 'daily') {
      startDate = new Date(targetDate.setHours(0, 0, 0, 0));
      endDate = new Date(targetDate.setHours(23, 59, 59, 999));
    } else if (period === 'monthly') {
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // Weekly
      const day = targetDate.getDay();
      startDate = new Date(targetDate);
      startDate.setDate(targetDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    }
    
    const where = {
      clinicId: req.user.clinicId,
      date: { gte: startDate, lte: endDate }
    };
    
    const [
      totalBills,
      billsByType,
      billsByStatus,
      totalRevenue,
      totalCollected,
      totalDue
    ] = await Promise.all([
      prisma.bill.count({ where }),
      prisma.bill.groupBy({
        by: ['type'],
        where,
        _count: true,
        _sum: { totalAmount: true }
      }),
      prisma.bill.groupBy({
        by: ['paymentStatus'],
        where,
        _count: true
      }),
      prisma.bill.aggregate({
        where,
        _sum: { totalAmount: true }
      }),
      prisma.bill.aggregate({
        where,
        _sum: { paidAmount: true }
      }),
      prisma.bill.aggregate({
        where,
        _sum: { dueAmount: true }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        totalBills,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalCollected: totalCollected._sum.paidAmount || 0,
        totalDue: totalDue._sum.dueAmount || 0,
        billsByType,
        billsByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary', error: error.message });
  }
});

// GET /:id - Get bill details
router.get('/:id', authenticate, checkPermission('billing:read'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const bill = await prisma.bill.findFirst({
      where: { id, clinicId: req.user.clinicId },
      include: {
        patient: { select: { id: true, name: true, phone: true, email: true, address: true } },
        items: { include: { product: { select: { id: true, name: true, code: true } } } },
        payments: true
      }
    });
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    // Parse taxBreakdown
    if (bill.taxBreakdown) {
      bill.taxBreakdownParsed = JSON.parse(bill.taxBreakdown);
    }

    // Compatibility aliases
    bill.total = bill.totalAmount;
    bill.amount = bill.totalAmount;
    bill.paid = bill.paidAmount;
    bill.due = bill.dueAmount;

    res.json({ success: true, data: bill });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bill', error: error.message });
  }
});

// POST /:id/payment - Record payment
router.post('/:id/payment', authenticate, checkPermission('billing:create'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, reference, notes, imageUrl } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    
    if (!method || !PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ success: false, message: `Invalid payment method. Must be one of: ${PAYMENT_METHODS.join(', ')}` });
    }
    
    const bill = await prisma.bill.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    if (bill.paymentStatus === 'PAID' || bill.dueAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Bill is already fully paid' });
    }
    
    const paymentAmount = Math.min(amount, bill.dueAmount);
    const newPaidAmount = bill.paidAmount + paymentAmount;
    const newDueAmount = bill.totalAmount - newPaidAmount;
    const newStatus = newDueAmount <= 0 ? 'PAID' : 'PARTIAL';
    
    const [payment, updatedBill] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          billId: id,
          clinicId: req.user.clinicId,
          amount: paymentAmount,
          method,
          reference,
          notes,
          imageUrl
        }
      }),
      prisma.bill.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus: newStatus,
          paymentMethod: method
        },
        include: {
          patient: { select: { id: true, name: true, phone: true } },
          items: true,
          payments: true
        }
      })
    ]);
    
    res.json({
      success: true,
      data: { payment, bill: updatedBill },
      message: `Payment of ₹${paymentAmount} recorded successfully`
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment', error: error.message });
  }
});

// PUT /:id - Update bill
router.put('/:id', authenticate, checkPermission('billing:create'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, paymentStatus } = req.body;
    
    const bill = await prisma.bill.findFirst({
      where: { id, clinicId: req.user.clinicId }
    });
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        items: true,
        payments: true
      }
    });
    
    res.json({ success: true, data: updatedBill, message: 'Bill updated successfully' });
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ success: false, message: 'Failed to update bill', error: error.message });
  }
});

// DELETE /:id - Delete/void bill (only if unpaid)
router.delete('/:id', authenticate, checkPermission('billing:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const bill = await prisma.bill.findFirst({
      where: { id, clinicId: req.user.clinicId },
      include: { payments: true }
    });
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    if (bill.payments.length > 0 || bill.paidAmount > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete bill with payments. Consider refunding instead.' });
    }
    
    await prisma.bill.delete({ where: { id } });
    
    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ success: false, message: 'Failed to delete bill', error: error.message });
  }
});

// GET /payments/recent - Recent payments
router.get('/payments/recent', authenticate, checkPermission('billing:read'), async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const payments = await prisma.payment.findMany({
      where: { clinicId: req.user.clinicId },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        bill: {
          select: { id: true, billNo: true, patient: { select: { id: true, name: true } } }
        }
      }
    });
    
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments', error: error.message });
  }
});

export default router;

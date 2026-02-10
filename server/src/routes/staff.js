import express from 'express';
import { prisma } from '../index.js';
import { authenticate, checkPermission } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET / - List staff
router.get('/', checkPermission('staff', 'read'), async (req, res, next) => {
  try {
    const { search, department, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { clinicId };
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { employeeId: { contains: search } },
        { user: { name: { contains: search } } },
        { designation: { contains: search } }
      ];
    }

    const [staff, total] = await Promise.all([
      prisma.staff.findMany({
        where, skip, take: limitNum,
        include: { user: { select: { id: true, name: true, email: true, phone: true, isActive: true } } },
        orderBy: { user: { name: 'asc' } }
      }),
      prisma.staff.count({ where })
    ]);

    res.json({
      success: true, data: staff,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// POST / - Create staff member  
router.post('/', checkPermission('staff', 'create'), async (req, res, next) => {
  try {
    const { name, email, phone, employeeId, department, designation, joinDate, salary, role = 'STAFF' } = req.body;
    const clinicId = req.user.clinicId;

    // Create user and staff in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name, email, phone: phone || null, role,
          password: '$2b$10$EpRnTzVlUpcdirVHxERBgOiXa6Dz2i5bPcZlRVe.JeDGh2oOKz8Dm', // default: password123
          clinicId
        }
      });
      const staff = await tx.staff.create({
        data: {
          userId: user.id, clinicId, employeeId, department, designation,
          joinDate: joinDate ? new Date(joinDate) : new Date(),
          salary: salary ? parseFloat(salary) : null
        },
        include: { user: { select: { id: true, name: true, email: true, phone: true, isActive: true } } }
      });
      return staff;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email or Employee ID already exists' });
    }
    next(error);
  }
});

// =====================
// ATTENDANCE ROUTES - Must be before /:id
// =====================

// GET /attendance/summary - Attendance summary for dashboard
router.get('/attendance/summary', checkPermission('staff', 'read'), async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const clinicId = req.user.clinicId;
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Count total staff
    const totalStaff = await prisma.staff.count({
      where: { clinicId }
    });
    
    // Count today's attendance
    const todayAttendance = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        staff: { clinicId },
        date: { gte: today, lt: tomorrow }
      },
      _count: true
    });
    
    // Calculate summary
    let presentToday = 0;
    let absentToday = 0;
    let onLeave = 0;
    
    todayAttendance.forEach(a => {
      if (a.status === 'PRESENT' || a.status === 'present') {
        presentToday = a._count;
      } else if (a.status === 'ABSENT' || a.status === 'absent') {
        absentToday = a._count;
      } else if (a.status === 'LEAVE' || a.status === 'leave' || a.status === 'ON_LEAVE') {
        onLeave = a._count;
      }
    });
    
    res.json({
      success: true,
      totalStaff,
      presentToday,
      absentToday,
      onLeave
    });
  } catch (error) {
    next(error);
  }
});

// GET /attendance - Attendance list
router.get('/attendance', checkPermission('staff', 'read'), async (req, res, next) => {
  try {
    const { date, staffId, status, month, year, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { staff: { clinicId } };
    
    // Filter by specific date
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: d, lt: nextDay };
    }
    // Filter by month and year (used by attendance calendar)
    else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }
    
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where, skip, take: limitNum,
        include: { staff: { include: { user: { select: { name: true } } } } },
        orderBy: { date: 'desc' }
      }),
      prisma.attendance.count({ where })
    ]);

    res.json({
      success: true, data: attendance,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// POST /attendance - Mark attendance
router.post('/attendance', checkPermission('staff', 'update'), async (req, res, next) => {
  try {
    const { staffId, date, checkIn, checkOut, status, notes } = req.body;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance record exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: { staffId, date: attendanceDate }
    });

    let attendance;
    if (existingAttendance) {
      // Update existing record
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: status || 'PRESENT',
          checkIn: checkIn ? new Date(checkIn) : undefined,
          checkOut: checkOut ? new Date(checkOut) : undefined,
          notes
        }
      });
    } else {
      // Create new record
      attendance = await prisma.attendance.create({
        data: {
          staffId,
          date: attendanceDate,
          status: status || 'PRESENT',
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          notes
        }
      });
    }

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

// PUT /attendance/:id - Update attendance
router.put('/attendance/:id', checkPermission('staff', 'update'), async (req, res, next) => {
  try {
    const { status, checkIn, checkOut, notes } = req.body;
    const attendance = await prisma.attendance.update({
      where: { id: req.params.id },
      data: { status, checkIn, checkOut, notes }
    });
    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

// =====================
// LEAVE ROUTES - Must be before /:id
// =====================

// GET /leaves - Leave requests
router.get('/leaves', checkPermission('staff', 'read'), async (req, res, next) => {
  try {
    const { staffId, status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const clinicId = req.user.clinicId;

    const where = { staff: { clinicId } };
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where, skip, take: limitNum,
        include: { staff: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.leave.count({ where })
    ]);

    res.json({
      success: true, data: leaves,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
});

// POST /leaves - Apply for leave
router.post('/leaves', checkPermission('staff', 'create'), async (req, res, next) => {
  try {
    const { staffId, startDate, endDate, type, reason } = req.body;
    const leave = await prisma.leave.create({
      data: {
        staffId, startDate: new Date(startDate), endDate: new Date(endDate),
        type, reason, status: 'PENDING'
      }
    });
    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    next(error);
  }
});

// PUT /leaves/:id - Approve/Reject leave
router.put('/leaves/:id', checkPermission('staff', 'update'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const leave = await prisma.leave.update({
      where: { id: req.params.id },
      data: {
        status,
        approvedBy: status === 'APPROVED' ? req.user.id : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined
      }
    });
    res.json({ success: true, data: leave });
  } catch (error) {
    next(error);
  }
});

// =====================
// DEPARTMENTS & DESIGNATIONS
// =====================

// GET /departments - Get unique departments
router.get('/departments', checkPermission('staff', 'read'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const departments = await prisma.staff.findMany({
      where: { clinicId },
      select: { department: true },
      distinct: ['department']
    });
    res.json({ success: true, data: departments.map(d => d.department).filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

// GET /designations - Get unique designations  
router.get('/designations', checkPermission('staff', 'read'), async (req, res, next) => {
  try {
    const clinicId = req.user.clinicId;
    const designations = await prisma.staff.findMany({
      where: { clinicId },
      select: { designation: true },
      distinct: ['designation']
    });
    res.json({ success: true, data: designations.map(d => d.designation).filter(Boolean) });
  } catch (error) {
    next(error);
  }
});

// =====================
// STAFF BY ID ROUTES - Must be LAST (catch-all pattern)
// =====================

// GET /:id - Get staff by ID
router.get('/:id', checkPermission('staff', 'read'), async (req, res, next) => {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true, role: true } },
        attendance: { orderBy: { date: 'desc' }, take: 30 },
        leaves: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - Update staff
router.put('/:id', checkPermission('staff', 'update'), async (req, res, next) => {
  try {
    const { name, email, phone, employeeId, department, designation, joinDate, salary } = req.body;
    
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.userId },
        data: { name, email, phone: phone || null }
      });
      return tx.staff.update({
        where: { id: req.params.id },
        data: {
          employeeId, department, designation,
          joinDate: joinDate ? new Date(joinDate) : undefined,
          salary: salary ? parseFloat(salary) : undefined
        },
        include: { user: { select: { id: true, name: true, email: true, phone: true, isActive: true } } }
      });
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email or Employee ID already exists' });
    }
    next(error);
  }
});

// PATCH /:id/deactivate - Deactivate staff
router.patch('/:id/deactivate', checkPermission('staff', 'update'), async (req, res, next) => {
  try {
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    
    await prisma.user.update({ where: { id: staff.userId }, data: { isActive: false } });
    res.json({ success: true, message: 'Staff deactivated' });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/activate - Activate staff
router.patch('/:id/activate', checkPermission('staff', 'update'), async (req, res, next) => {
  try {
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    
    await prisma.user.update({ where: { id: staff.userId }, data: { isActive: true } });
    res.json({ success: true, message: 'Staff activated' });
  } catch (error) {
    next(error);
  }
});

export default router;

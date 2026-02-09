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
      } else if (a.status === 'LEAVE' || a.status === 'leave') {
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

// POST /attendance - Mark attendance
router.post('/attendance', checkPermission('staff', 'update'), async (req, res, next) => {
  try {
    const { staffId, date, checkIn, checkOut, status, notes } = req.body;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.upsert({
      where: { staffId_date: { staffId, date: attendanceDate } },
      create: {
        staffId, date: attendanceDate, status: status || 'PRESENT',
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        notes
      },
      update: {
        status, checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined, notes
      }
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
});

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

export default router;

import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

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
        { name: { contains: search } },
        { city: { contains: search } },
        { phone: { contains: search } }
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

    // Add owner info to each clinic
    const clinicsWithOwner = clinics.map(clinic => ({
      ...clinic,
      owner: clinic.users?.[0] || null,
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
    const revenueSummary = await prisma.bill.aggregate({
      where: { clinicId: clinic.id },
      _sum: { totalAmount: true, paidAmount: true }
    });

    res.json({
      success: true,
      data: {
        ...clinic,
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
          licenseNumber
        }
      });

      const owner = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone,
          password: hashedPassword,
          role: 'DOCTOR',
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
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
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
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

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
      newPatientsThisMonth
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
            take: 1,
            select: { id: true, name: true, email: true }
          },
          _count: { select: { users: true, patients: true } }
        }
      }),
      prisma.clinic.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.clinic.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth }, role: { not: 'SUPER_ADMIN' } } }),
      prisma.patient.count({ where: { createdAt: { gte: thisMonth } } })
    ]);

    // Get monthly growth data for charts (last 6 months)
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const monthlyGrowth = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
      
      const [clinicsCount, usersCount, patientsCount, revenueSum] = await Promise.all([
        prisma.clinic.count({ where: { createdAt: { lte: monthEnd } } }),
        prisma.user.count({ where: { createdAt: { lte: monthEnd }, role: { not: 'SUPER_ADMIN' } } }),
        prisma.patient.count({ where: { createdAt: { lte: monthEnd } } }),
        prisma.bill.aggregate({
          where: { createdAt: { gte: monthStart, lte: monthEnd } },
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
          newPatientsThisMonth
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

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// ===========================================
// REGISTER (Initial clinic setup)
// ===========================================
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('clinicName').trim().notEmpty().withMessage('Clinic name is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, clinicName, clinicAddress, clinicCity, clinicState, clinicPincode } = req.body;

    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });

    if (existingUser) {
      throw new AppError('User with this email or phone already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create clinic and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: clinicName,
          address: clinicAddress || '',
          city: clinicCity || '',
          state: clinicState || '',
          pincode: clinicPincode || '',
          phone: phone
        }
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          role: 'DOCTOR', // First user is doctor/owner
          clinicId: clinic.id
        }
      });

      return { clinic, user };
    });

    const token = jwt.sign(
      { userId: result.user.id, role: result.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info(`New clinic registered: ${clinicName} by ${email}`);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        clinic: result.clinic
      }
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// LOGIN
// ===========================================
router.post('/login', [
  body('email').notEmpty().withMessage('Email or phone required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: email }
        ]
      },
      include: { clinic: true }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        device: req.headers['user-agent']
      }
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
        clinic: user.clinic
      }
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// GET CURRENT USER
// ===========================================
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      avatar: req.user.avatar,
      preferences: req.user.preferences,
      clinic: req.user.clinic
    }
  });
});

// ===========================================
// UPDATE PROFILE
// ===========================================
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(avatar && { avatar })
      },
      include: { clinic: true }
    });

    res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        avatar: updated.avatar,
        clinic: updated.clinic
      }
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// UPDATE PREFERENCES (Dashboard customization)
// ===========================================
router.patch('/preferences', authenticate, async (req, res, next) => {
  try {
    const { preferences } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferences }
    });

    res.json({
      message: 'Preferences updated',
      preferences: updated.preferences
    });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// CHANGE PASSWORD
// ===========================================
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// ===========================================
// LOGOUT
// ===========================================
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    await prisma.session.deleteMany({
      where: { token }
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

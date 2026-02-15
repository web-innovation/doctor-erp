import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { logImpersonation } from '../middleware/hipaaAudit.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { logAuthEvent } from '../middleware/hipaaAudit.js';
import { validatePassword, hashPassword, getPasswordRequirements } from '../utils/passwordPolicy.js';

const router = express.Router();

// Get client IP helper
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

// ===========================================
// PASSWORD REQUIREMENTS (for UI)
// ===========================================
router.get('/password-requirements', (req, res) => {
  res.json(getPasswordRequirements());
});

// ===========================================
// REGISTER (Initial clinic setup)
// ===========================================
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('clinicName').trim().notEmpty().withMessage('Clinic name is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, clinicName, clinicAddress, clinicCity, clinicState, clinicPincode } = req.body;

    // HIPAA: Validate password meets security requirements
    const passwordValidation = validatePassword(password, { email, name });
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });

    if (existingUser) {
      throw new AppError('User with this email or phone already exists', 409);
    }

    // HIPAA: Use stronger hashing
    const hashedPassword = await hashPassword(password);

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
    const clientIP = getClientIP(req);

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
      // HIPAA: Log failed login attempt
      await logAuthEvent('LOGIN_FAILED', null, {
        reason: 'User not found',
        attemptedEmail: email,
        ipAddress: clientIP,
        userAgent: req.headers['user-agent']
      });
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      // HIPAA: Log attempt to access deactivated account
      await logAuthEvent('LOGIN_FAILED', user.id, {
        reason: 'Account deactivated',
        ipAddress: clientIP,
        userAgent: req.headers['user-agent']
      });
      throw new AppError('Account is deactivated', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // HIPAA: Log failed password attempt
      await logAuthEvent('LOGIN_FAILED', user.id, {
        reason: 'Invalid password',
        ipAddress: clientIP,
        userAgent: req.headers['user-agent']
      });
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
        ipAddress: clientIP,
        device: req.headers['user-agent']
      }
    });

    // HIPAA: Log successful login
    await logAuthEvent('LOGIN_SUCCESS', user.id, {
      ipAddress: clientIP,
      userAgent: req.headers['user-agent']
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

// POST /impersonate - create a short-lived impersonation token for target user
router.post('/impersonate', authenticate, async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, include: { clinic: true } });
    if (!target) return res.status(404).json({ message: 'Target user not found' });
    if (!target.isActive) return res.status(400).json({ message: 'Target user is not active' });

    // Only SUPER_ADMIN or DOCTOR (including staff who are effectively doctors) of same clinic can impersonate
    const userRole = (req.user.effectiveRole || req.user.role || '').toString().toUpperCase();
    const allowed = userRole === 'SUPER_ADMIN' || (userRole === 'DOCTOR' && req.user.clinicId === target.clinicId);
    if (!allowed) return res.status(403).json({ message: 'Not authorized to impersonate this user' });

    // Create short-lived token (15 minutes)
    const token = jwt.sign(
      { userId: target.id, role: target.role, impersonatorId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Create a session entry for the impersonation token
    const clientIP = getClientIP(req);
    await prisma.session.create({ data: { userId: target.id, token, expiresAt: new Date(Date.now() + 15 * 60 * 1000), ipAddress: clientIP, device: `impersonation:${req.user.id}` } });

    // Audit log
    await logImpersonation(req.user.id, target.id, { path: req.originalUrl, ipAddress: clientIP, userAgent: req.headers['user-agent'] });

    res.json({ token, user: { id: target.id, name: target.name, email: target.email, role: target.role, clinic: target.clinic } });
  } catch (error) {
    next(error);
  }
});

export default router;

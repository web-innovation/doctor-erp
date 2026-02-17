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
import crypto from 'crypto';
import { sendSms } from '../services/smsService.js';
import { requestOtp, verifyOtp, getOtpForDebug } from '../services/otpService.js';
import emailService from '../services/emailService.js';

const router = express.Router();


// Get client IP helper
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

// Normalize phone numbers to a canonical form for OTP storage/lookup
function normalizePhone(phone){
  if(!phone) return phone;
  let d = String(phone).replace(/\D/g,'');
  // strip leading zeros
  d = d.replace(/^0+/, '');
  // strip leading country code 91 for India
  if(d.length > 10 && d.startsWith('91')) d = d.slice(2);
  return d;
}

// ===========================================
// PASSWORD REQUIREMENTS (for UI)
// ===========================================
router.get('/password-requirements', (req, res) => {
  res.json(getPasswordRequirements());
});

// ===========================================
// REQUEST OTP (for mobile-only login/signup)
// body: { mobile: "+919876543210" }
// ===========================================
router.post('/request-otp', async (req, res, next) => {
  try{
    const { mobile } = req.body;
    if(!mobile) return res.status(400).json({ error: 'mobile required' });
    const normalized = normalizePhone(mobile);
    console.log(`[Auth] /request-otp called for mobile=${mobile} normalized=${normalized}`);
    // request OTP via otpService (uses Redis if configured)
    const r = await requestOtp(normalized);
    console.log(`[Auth] OTP generated for ${normalized}: ${r.code}`);
    const message = `Your DocClinic OTP is ${r.code}. It expires in 5 minutes.`;
    // send SMS to the original provided number
    await sendSms(mobile, message, { type: 'Transactional' });
    // Also attempt to send OTP to email registered for this mobile (if any)
    try{
      // look up patient or user by normalized or raw phone
      const patient = await prisma.patient.findFirst({ where: { OR: [{ phone: mobile }, { phone: normalized }] } });
      const user = await prisma.user.findFirst({ where: { OR: [{ phone: mobile }, { phone: normalized }] } });
      // prefer patient email if available, else user email
      const email = patient?.email || user?.email || null;
      const clinicId = patient?.clinicId || user?.clinicId || null;
      if(email){
        const expiryMinutes = 5;
        let html = `<p>Your OTP is <strong>${r.code}</strong>. It expires in ${expiryMinutes} minutes.</p>`;
        let text = `Your DocClinic OTP is ${r.code}. It expires in ${expiryMinutes} minutes.`;
        if(clinicId){
          const tplRecord = await prisma.clinicSettings.findFirst({ where: { key: 'otp_email_template', clinicId } });
          if(tplRecord?.value){
            const t = tplRecord.value;
            html = t
              .replace(/\{\{\s*code\s*\}\}/g, r.code)
              .replace(/\{\{\s*expiryMinutes\s*\}\}/g, String(expiryMinutes))
              .replace(/\{\{\s*clinicName\s*\}\}/g, (await prisma.clinic.findUnique({ where: { id: clinicId } }))?.name || '')
              .replace(/\{\{\s*email\s*\}\}/g, email || '');
            text = html.replace(/<[^>]+>/g, '');
          }
        } else {
          html = html.replace(/\{\{\s*code\s*\}\}/g, r.code).replace(/\{\{\s*expiryMinutes\s*\}\}/g, String(expiryMinutes)).replace(/\{\{\s*email\s*\}\}/g, email || '');
          text = text.replace(/\{\{\s*code\s*\}\}/g, r.code).replace(/\{\{\s*expiryMinutes\s*\}\}/g, String(expiryMinutes)).replace(/\{\{\s*email\s*\}\}/g, email || '');
        }

        try{
          await emailService.sendEmail({ to: email, subject: 'Your DocClinic OTP', text, html, type: 'otp', clinicId: clinicId || undefined });
          req.logger?.info?.(`OTP email sent to ${email} for mobile ${mobile}`);
        }catch(e){
          req.logger?.warn?.('Failed to send OTP email for mobile', mobile, e.message || e);
        }
      }
    }catch(emailErr){
      // don't block OTP SMS flow if anything above fails
      req.logger?.warn?.('Error while attempting to send OTP email', emailErr);
    }
    // If in sandbox, return code for debugging
    if(process.env.SMS_SANDBOX === 'true'){
      return res.json({ ok: true, message: 'OTP sent (sandbox)', code: r.code });
    }
    return res.json({ ok: true, message: 'OTP sent' });
  }catch(err){
    next(err);
  }
});

// ===========================================
// REQUEST EMAIL OTP
// body: { email: "user@example.com" }
// ===========================================
router.post('/request-email-otp', async (req, res, next) => {
  try{
    const { email } = req.body;
    if(!email) return res.status(400).json({ error: 'email required' });

    const r = await requestOtp(email);
    const expiryMinutes = 5;

    // Try to load clinic-specific OTP template if clinicId provided
    const clinicId = req.body.clinicId || req.headers['x-clinic-id'] || null;
    let html = `<p>Your OTP is <strong>${r.code}</strong>. It expires in ${expiryMinutes} minutes.</p>`;
    let text = `Your DocClinic OTP is ${r.code}. It expires in ${expiryMinutes} minutes.`;

    try{
      let clinic = null;
      if (clinicId) {
        clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
        const tplRecord = await prisma.clinicSettings.findFirst({ where: { key: 'otp_email_template', clinicId } });
        if (tplRecord?.value) {
          const t = tplRecord.value;
          html = t
            .replace(/\{\{\s*code\s*\}\}/g, r.code)
            .replace(/\{\{\s*expiryMinutes\s*\}\}/g, String(expiryMinutes))
            .replace(/\{\{\s*clinicName\s*\}\}/g, clinic?.name || '')
            .replace(/\{\{\s*email\s*\}\}/g, email || '');
          // build simple text version by stripping tags
          text = html.replace(/<[^>]+>/g, '');
        }
      } else {
        // replace email placeholder even when no clinic
        html = html.replace(/\{\{\s*code\s*\}\}/g, r.code).replace(/\{\{\s*expiryMinutes\s*\}\}/g, String(expiryMinutes)).replace(/\{\{\s*email\s*\}\}/g, email || '');
        text = text.replace(/\{\{\s*code\s*\}\}/g, r.code).replace(/\{\{\s*expiryMinutes\s*\}\}/g, String(expiryMinutes)).replace(/\{\{\s*email\s*\}\}/g, email || '');
      }

      await emailService.sendEmail({
        to: email,
        subject: 'Your DocClinic OTP',
        text,
        html,
        type: 'otp',
        clinicId: clinicId || undefined
      });
    }catch(err){
      // email send failed — still return generic response to avoid enumeration
      req.logger?.warn?.('Failed to send OTP email', err);
    }

    if(process.env.SMS_SANDBOX === 'true'){
      return res.json({ ok: true, message: 'OTP sent (sandbox)', code: r.code });
    }
    return res.json({ ok: true, message: 'OTP sent' });
  }catch(err){
    next(err);
  }
});

// ===========================================
// VERIFY EMAIL OTP
// body: { email, otp }
// ===========================================
router.post('/verify-email-otp', async (req, res, next) => {
  try{
    const { email, otp } = req.body;
    if(!email || !otp) return res.status(400).json({ error: 'email and otp required' });
    const ok = await verifyOtp(email, otp);
    if(!ok) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // find or create user by email
    let user = await prisma.user.findFirst({ where: { email } });
    if(!user){
      const tempPwd = crypto.randomBytes(12).toString('hex');
      const hashed = await hashPassword(tempPwd);
      user = await prisma.user.create({ data: { email, name: 'Patient', role: 'PATIENT', password: hashed } });
      console.log(`[Auth] Created PATIENT user for email=${email} with temp password`);
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const clientIP = getClientIP(req);
    await prisma.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7*24*60*60*1000), ipAddress: clientIP, device: req.headers['user-agent'] } });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }catch(err){
    next(err);
  }
});

// ===========================================
// VERIFY OTP - returns JWT token + user
// body: { mobile, otp }
// If user does not exist, create a minimal PATIENT user
// ===========================================
router.post('/verify-otp', async (req, res, next) => {
  try{
    const { mobile, otp } = req.body;
    const normalized = normalizePhone(mobile);
    console.log(`[Auth] /verify-otp called for mobile=${mobile} normalized=${normalized} otp=${otp}`);
    if(!mobile || !otp) return res.status(400).json({ error: 'mobile and otp required' });
    const ok = await verifyOtp(normalized, otp);
    console.log(`[Auth] verifyOtp result for ${normalized}: ${ok}`);
    if(!ok) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // OTP valid - find or create user
    const normalizedPhone = normalized;
    console.log(`[Auth] verify-otp phone received=${mobile} normalized=${normalizedPhone}`);
    // Try to find existing patient/user by normalized phone first
    let user = await prisma.user.findFirst({ where: { OR: [{ phone: mobile }, { phone: normalizedPhone }] } });
    let patient = await prisma.patient.findFirst({ where: { OR: [{ phone: mobile }, { phone: normalizedPhone }] } });
    if(!user && patient){
      // prefer patient's email
      const emailFromPatient = patient.email;
      const tempPwd = crypto.randomBytes(12).toString('hex');
      const hashed = await hashPassword(tempPwd);
      user = await prisma.user.create({ data: { phone: mobile, email: emailFromPatient || `${normalizedPhone}@mobile.local`, name: 'Patient', role: 'PATIENT', password: hashed, clinicId: patient.clinicId } });
      console.log(`[Auth] Created PATIENT user for phone=${mobile} with patient email=${emailFromPatient}`);
    }
    if(!user){
      const tempPwd = crypto.randomBytes(12).toString('hex');
      const hashed = await hashPassword(tempPwd);
      user = await prisma.user.create({ data: { phone: mobile, email: `${normalizedPhone}@mobile.local`, name: 'Patient', role: 'PATIENT', password: hashed } });
      console.log(`[Auth] Created PATIENT user for phone=${mobile} (email ${normalizedPhone}@mobile.local)`);
    }

    // create session token
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const clientIP = getClientIP(req);
    await prisma.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7*24*60*60*1000), ipAddress: clientIP, device: req.headers['user-agent'] } });

    // OTP consumed by otpService (no-op here)

    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  }catch(err){
    next(err);
  }
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

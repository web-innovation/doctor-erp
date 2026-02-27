import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { AppError } from './errorHandler.js';

// Authenticate: verify JWT and attach user + clinic + staffProfile
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next(new AppError('No token provided', 401));

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { clinic: true, staffProfile: true } });
    if (!user || !user.isActive) return next(new AppError('User not found or inactive', 401));

    // attach raw user and clinicId
    req.user = user;
    req.clinicId = user.clinicId;

    // Build an effectiveRole string that may contain multiple tokens.
    // Example: role='STAFF', designation='Admin Doctor' -> effectiveRole='STAFF DOCTOR ADMIN'
    try {
      const parts = [];
      if (user.role) parts.push(user.role.toString().toUpperCase());
      if (user.staffProfile && user.staffProfile.designation) {
        const des = user.staffProfile.designation.toString().toLowerCase();
        if (des.includes('doctor')) parts.push('DOCTOR');
        if (des.includes('admin') || des.includes('clinic admin')) parts.push('ADMIN');
      }
      // dedupe and attach
      req.user.effectiveRole = [...new Set(parts)].join(' ');
      // also expose a boolean for convenience: isClinicAdmin
      try {
        const tokens = getUserRoleTokens(req);
        req.user.isClinicAdmin = tokens.has('ADMIN') || (req.user.role || '').toString().toUpperCase() === 'ADMIN';
      } catch (e) {
        req.user.isClinicAdmin = (req.user.role || '').toString().toUpperCase() === 'ADMIN';
      }
    } catch (e) {
      req.user.effectiveRole = (req.user.role || '').toString().toUpperCase();
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Helper to test whether the current request user should be treated as a doctor
export function isEffectiveDoctor(req) {
  try {
    const eff = (req.user && (req.user.effectiveRole || req.user.role) || '').toString().toUpperCase();
    // tokenized check
    return eff.split(/[^A-Z0-9]+/i).map(s => s.trim()).filter(Boolean).includes('DOCTOR');
  } catch (e) {
    return false;
  }
}

// Check whether requester (doctor) is allowed to view patients/appointments/prescriptions
// for the given `viewUserId`. Returns an object: { allowed: boolean, notStaff?: boolean }
export async function canDoctorViewStaff(req, viewUserId) {
  if (!isEffectiveDoctor(req)) return { allowed: false };
  if (!viewUserId) return { allowed: true };

  if (viewUserId === req.user.id) return { allowed: true };

  // Ensure viewUserId corresponds to a staff member in same clinic
  try {
    const staff = await prisma.staff.findFirst({ where: { userId: viewUserId, clinicId: req.user.clinicId } });
    if (!staff) return { allowed: false, notStaff: true };

    const assignment = await prisma.staffAssignment.findUnique({ where: { staffId_doctorId: { staffId: staff.id, doctorId: req.user.id } } }).catch(() => null);
    if (!assignment) return { allowed: false };

    return { allowed: true };
  } catch (e) {
    return { allowed: false };
  }
}

// Role-based access control
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    // allow if any of the allowedRoles appear in user's role tokens
    const tokens = getUserRoleTokens(req);
    const ok = allowedRoles.some(r => tokens.has((r || '').toString().toUpperCase()));
    if (!ok) return next(new AppError('Insufficient permissions', 403));
    return next();
  };
}

// Role hierarchy for permission checks
const roleHierarchy = {
  SUPER_ADMIN: 100,
  ADMIN: 90,
  DOCTOR: 80,
  ACCOUNTANT: 60,
  PHARMACIST: 50,
  RECEPTIONIST: 40,
  STAFF: 20
};

// Check if user has at least a certain role level
export function requireRoleLevel(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }
    const tokens = getUserRoleTokens(req);
    // compute highest user level across tokens
    let userLevel = 0;
    for (const t of tokens) userLevel = Math.max(userLevel, roleHierarchy[t] || 0);
    const requiredLevel = roleHierarchy[minRole] || 0;
    if (userLevel < requiredLevel) return next(new AppError('Insufficient permissions', 403));
    return next();
  };
}

// Permission definitions for features
export const PERMISSIONS = {
  // Dashboard
  'dashboard:read': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'RECEPTIONIST', 'PHARMACIST', 'STAFF'],
  
  // Patient Management
  'patients': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST'],
  'patients:read': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST'],
  'patients:create': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  'patients:update': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  'patients:delete': ['SUPER_ADMIN'],
  PATIENT_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST'],
  PATIENT_CREATE: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  PATIENT_EDIT: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  PATIENT_DELETE: ['SUPER_ADMIN'],

  // Appointments
  'appointments': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST'],
  'appointments:read': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST'],
  'appointments:create': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST'],
  'appointments:update': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST'],
  'appointments:delete': ['SUPER_ADMIN', 'DOCTOR'],
  APPOINTMENT_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST'],
  APPOINTMENT_CREATE: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST'],
  APPOINTMENT_EDIT: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PHARMACIST'],
  APPOINTMENT_DELETE: ['SUPER_ADMIN', 'DOCTOR'],

  // Prescriptions
  'prescriptions': ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST'],
  'prescriptions:read': ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST'],
  'prescriptions:create': ['SUPER_ADMIN', 'DOCTOR'],
  'prescriptions:update': ['SUPER_ADMIN', 'DOCTOR'],
  PRESCRIPTION_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST'],
  PRESCRIPTION_CREATE: ['SUPER_ADMIN', 'DOCTOR'],
  PRESCRIPTION_EDIT: ['SUPER_ADMIN', 'DOCTOR'],

  // Pharmacy
  'pharmacy': ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'],
  'pharmacy:read': ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'],
  'pharmacy:create': ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST'],
  'pharmacy:update': ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST'],
  'pharmacy:delete': ['SUPER_ADMIN'],
  PHARMACY_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'],
  PHARMACY_STOCK_UPDATE: ['SUPER_ADMIN', 'PHARMACIST'],
  PHARMACY_PRICING: ['SUPER_ADMIN', 'ACCOUNTANT'],

  // Billing
  'billing:read': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'RECEPTIONIST'],
  'billing:create': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST', 'RECEPTIONIST'],
  'billing:edit': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST', 'RECEPTIONIST'],
  BILLING_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'RECEPTIONIST'],
  BILLING_CREATE: ['SUPER_ADMIN', 'ACCOUNTANT', 'PHARMACIST', 'RECEPTIONIST'],
  BILLING_REFUND: ['SUPER_ADMIN', 'ACCOUNTANT'],

  // Staff Management
  'staff:read': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'RECEPTIONIST'],
  'staff:update': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  'staff:create': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  'staff:manage': ['SUPER_ADMIN'],
  STAFF_VIEW: ['SUPER_ADMIN', 'ACCOUNTANT'],
  STAFF_MANAGE: ['SUPER_ADMIN'],
  ATTENDANCE_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'RECEPTIONIST', 'STAFF'],
  ATTENDANCE_MARK: ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],

  // Leaves (Leave Management)
  'leaves:read': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'RECEPTIONIST'],
  'leaves:create': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
  'leaves:update': ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
  LEAVES_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'RECEPTIONIST'],

  // Reports
  'reports:sales': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  'reports:patients': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  'reports:opd': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  'reports:pharmacy': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'],
  'reports:collections': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  'reports:commissions': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  REPORTS_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  REPORTS_EXPORT: ['SUPER_ADMIN', 'ACCOUNTANT'],

  // Labs & Agents
  'labs:read': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  'labs:manage': ['SUPER_ADMIN', 'DOCTOR'],
  'labs:create': ['SUPER_ADMIN', 'DOCTOR'],
  'labs:update': ['SUPER_ADMIN', 'DOCTOR'],
  'labs:tests': ['SUPER_ADMIN', 'DOCTOR', 'LAB_TECHNICIAN'],
  'agents:read': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  'agents:manage': ['SUPER_ADMIN', 'DOCTOR'],
  'agents:create': ['SUPER_ADMIN', 'DOCTOR'],
  'agents:update': ['SUPER_ADMIN', 'DOCTOR'],
  'commissions:read': ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  'commissions:pay': ['SUPER_ADMIN', 'ACCOUNTANT'],
  LABS_AGENTS_VIEW: ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT'],
  LABS_AGENTS_MANAGE: ['SUPER_ADMIN', 'DOCTOR'],

  // Settings
  'clinic:read': ['SUPER_ADMIN', 'DOCTOR'],
  'clinic:manage': ['SUPER_ADMIN', 'DOCTOR'],
  'settings:clinic': ['SUPER_ADMIN', 'DOCTOR'],
  CLINIC_SETTINGS: ['SUPER_ADMIN', 'DOCTOR'],
  TAX_SETTINGS: ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']
};

// Blogs
PERMISSIONS['blogs:manage'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'];
PERMISSIONS['blogs:create'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'];
PERMISSIONS['blogs:update'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'];
PERMISSIONS['blogs:delete'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'];

// Purchases & OCR
PERMISSIONS['purchases'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'RECEPTIONIST'];
PERMISSIONS['purchases:create'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'RECEPTIONIST'];
PERMISSIONS['purchases:update'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'];
PERMISSIONS['purchases:read'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'RECEPTIONIST'];
PERMISSIONS['purchases:receive'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'];
// Allow delete for purchases to appropriate admin roles
PERMISSIONS['purchases:delete'] = ['SUPER_ADMIN', 'ADMIN'];

// Ledger permissions
PERMISSIONS['ledger'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'];
PERMISSIONS['ledger:read'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'];
PERMISSIONS['ledger:create'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'];
PERMISSIONS['ledger:update'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'];
PERMISSIONS['ledger:delete'] = ['SUPER_ADMIN', 'ADMIN'];

// Document AI usage permission (UI flag)
PERMISSIONS['document_ai:use'] = ['SUPER_ADMIN', 'PHARMACIST', 'ACCOUNTANT'];

// Check permission middleware
export function checkPermission(resource, action) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Not authenticated', 401));
      }

      // Support both single string and two-arg formats
      // e.g., checkPermission('dashboard:read') or checkPermission('pharmacy', 'read')
      let permission = resource;
      if (action) {
        permission = `${resource}:${action}`;
      }

      // Start with global permission definitions
      const allowedRolesSet = new Set(PERMISSIONS[permission] || []);
      let permissionDisabled = false;

      // Try to fetch clinic-level overrides (additive)
      try {
        if (req.user && req.user.clinicId) {
          const [clinic, controls] = await Promise.all([
            prisma.clinic.findUnique({ where: { id: req.user.clinicId }, select: { rolePermissions: true } }),
            prisma.clinicSettings.findUnique({
              where: { clinicId_key: { clinicId: req.user.clinicId, key: 'super_admin_controls' } },
              select: { value: true }
            }).catch(() => null)
          ]);
          if (clinic && clinic.rolePermissions) {
            try {
              const overrides = JSON.parse(clinic.rolePermissions);
              // Expected format: { ROLE_NAME: [ 'permission:key', ... ], ... }
              Object.entries(overrides).forEach(([role, perms]) => {
                if (Array.isArray(perms) && (perms.includes(permission) || perms.includes('*'))) {
                  allowedRolesSet.add(role);
                }
              });
            } catch (err) {
              // Invalid JSON - ignore clinic overrides
              console.warn('Invalid clinic.rolePermissions JSON', err);
            }
          }

          // Super-admin clinic controls can hard-disable specific permissions for clinic users.
          try {
            const payload = controls?.value ? JSON.parse(controls.value) : null;
            const disabled = Array.isArray(payload?.disabledPermissions) ? payload.disabledPermissions : [];
            const normalizeDisabled = (value) => {
              const raw = String(value || '').trim().toLowerCase();
              if (!raw) return '';
              // tolerate common typo: leader -> ledger
              if (raw.startsWith('leader')) return raw.replace(/^leader/, 'ledger');
              return raw;
            };
            const disabledSet = new Set(disabled.map(normalizeDisabled).filter(Boolean));
            const perm = String(permission || '').toLowerCase();
            const resource = perm.split(':')[0];
            const isDisabled = disabledSet.has(perm)
              || disabledSet.has(resource)
              || disabledSet.has(`${resource}:*`)
              || (disabledSet.has('*'));
            if (isDisabled) {
              allowedRolesSet.clear();
              permissionDisabled = true;
            }
          } catch (_err) {
            // ignore invalid controls payload
          }
        }
      } catch (err) {
        // If clinic lookup fails, fall back to global permissions
        console.warn('Failed to load clinic rolePermissions', err);
      }

      const userTokens = getUserRoleTokens(req);
      if (permissionDisabled && !userTokens.has('SUPER_ADMIN')) {
        return next(new AppError(`Permission disabled by super admin: ${permission}`, 403));
      }

      // Short-circuit: SUPER_ADMIN and clinic ADMINs may bypass per-clinic checks
      if (userTokens.has('SUPER_ADMIN')) return next();
      if (userTokens.has('ADMIN')) return next();

      const allowedRolesList = [...allowedRolesSet];
      const allowed = allowedRolesList.some(r => userTokens.has(r.toString().toUpperCase()));

      if (!allowed) {
        // Fallback: allow if user's highest role level >= minimum allowed role level
        try {
          const allowedLevels = allowedRolesList.map(r => roleHierarchy[(r || '').toString().toUpperCase()] || 0).filter(l => l > 0);
          const minAllowedLevel = allowedLevels.length ? Math.min(...allowedLevels) : 0;
          let userMaxLevel = 0;
          for (const ur of userTokens) userMaxLevel = Math.max(userMaxLevel, roleHierarchy[(ur || '').toString().toUpperCase()] || 0);
          if (userMaxLevel >= minAllowedLevel && minAllowedLevel > 0) return next();
        } catch (e) {
          // ignore
        }

        console.warn('Permission denied check', { permission, allowedRoles: allowedRolesList, userRoles: [...userTokens], clinicId: req.user.clinicId, userId: req.user.id });
        return next(new AppError(`Permission denied: ${permission}`, 403));
      }

      return next();
    } catch (error) {
      next(error);
    }
  };
}

// Helper: produce normalized role tokens Set from req.user
function getUserRoleTokens(req) {
  const out = new Set();
  try {
    const raw = [ (req.user && req.user.role) || '', (req.user && req.user.effectiveRole) || '' ];
    for (const r of raw) {
      const up = (r || '').toString().toUpperCase().trim();
      if (!up) continue;
      out.add(up);
      if (['NURSE', 'LAB_TECHNICIAN'].includes(up)) out.add('STAFF');
      const parts = up.split(/[^A-Z0-9]+/i).map(p => p.trim()).filter(Boolean);
      for (const p of parts) {
        out.add(p);
        if (['NURSE', 'LAB_TECHNICIAN'].includes(p)) out.add('STAFF');
      }
    }
  } catch (e) {
    // ignore
  }
  return out;
}

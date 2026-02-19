import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { AppError } from './errorHandler.js';

// Verify JWT token
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        clinic: true,
        staffProfile: true
      }
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    req.user = user;
    // Compute an effective role: some users are stored with role 'STAFF' but
    // have a staffProfile.designation that indicates they are a doctor. Set
    // `effectiveRole` to allow permission checks to consider this.
    try {
      let effective = (user.role || '').toString().toUpperCase();
      if (effective === 'STAFF' && user.staffProfile && user.staffProfile.designation) {
        const des = user.staffProfile.designation.toString().toLowerCase();
        if (des.includes('doctor')) effective = 'DOCTOR';
      }
      req.user.effectiveRole = effective;
    } catch (e) {
      req.user.effectiveRole = (req.user.role || '').toString().toUpperCase();
    }
    req.clinicId = user.clinicId;
    
    next();
  } catch (error) {
    next(error);
  }
}

// Helper to test whether the current request user should be treated as a doctor
export function isEffectiveDoctor(req) {
  try {
    const eff = (req.user && (req.user.effectiveRole || req.user.role) || '').toString().toUpperCase();
    return eff === 'DOCTOR';
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

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
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

    const userLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[minRole] || 0;

    if (userLevel < requiredLevel) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
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

// Purchases & OCR
PERMISSIONS['purchases'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'RECEPTIONIST'];
PERMISSIONS['purchases:create'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'RECEPTIONIST'];
PERMISSIONS['purchases:update'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'];
PERMISSIONS['purchases:read'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT', 'RECEPTIONIST'];
PERMISSIONS['purchases:receive'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'PHARMACIST', 'ACCOUNTANT'];

// Ledger permissions (read-only for now)
PERMISSIONS['ledger'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'];
PERMISSIONS['ledger:read'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'];
PERMISSIONS['ledger:create'] = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST'];

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

      // Try to fetch clinic-level overrides (additive)
      try {
        if (req.user && req.user.clinicId) {
          const clinic = await prisma.clinic.findUnique({ where: { id: req.user.clinicId }, select: { rolePermissions: true } });
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
        }
      } catch (err) {
        // If clinic lookup fails, fall back to global permissions
        console.warn('Failed to load clinic rolePermissions', err);
      }

      // Allow if user's stored role OR computed effectiveRole is permitted
      const userRolesToCheck = new Set([ (req.user.role || '').toString().toUpperCase(), (req.user.effectiveRole || '').toString().toUpperCase() ]);
      const allowedRolesList = [...allowedRolesSet];
      const userRolesArray = [...userRolesToCheck];
      const allowed = allowedRolesList.some(r => userRolesToCheck.has(r.toString().toUpperCase()));
      if (!allowed) {
        console.warn('Permission denied check', { permission, allowedRoles: allowedRolesList, userRoles: userRolesArray, clinicId: req.user.clinicId, userId: req.user.id });
        return next(new AppError(`Permission denied: ${permission}`, 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

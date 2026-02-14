/**
 * HIPAA Compliance - Audit Logging Middleware
 * 
 * Logs all access to Protected Health Information (PHI) as required by HIPAA.
 * This includes: who accessed what, when, from where, and what action was performed.
 * 
 * HIPAA Requirements Addressed:
 * - 164.312(b) - Audit Controls
 * - 164.308(a)(1)(ii)(D) - Information System Activity Review
 */

import { prisma } from '../index.js';
import { logger } from '../config/logger.js';

// PHI-related entities that require audit logging
const PHI_ENTITIES = [
  'patients',
  'prescriptions',
  'appointments',
  'bills',
  'medical-history',
  'vitals',
  'health-records'
];

// Map HTTP methods to actions
const METHOD_ACTION_MAP = {
  GET: 'VIEW',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE'
};

/**
 * Extract entity and ID from request path
 */
function parseRequestPath(path) {
  const parts = path.split('/').filter(Boolean);
  // Remove 'api' prefix if present
  if (parts[0] === 'api') parts.shift();
  
  const entity = parts[0] || 'unknown';
  const entityId = parts[1] || null;
  
  return { entity, entityId };
}

/**
 * Sanitize data to remove sensitive fields before logging
 */
function sanitizeData(data) {
  if (!data) return null;
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Get client IP address from request
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Create audit log entry in database
 */
async function createAuditLog(logData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: logData.action,
        entity: logData.entity,
        entityId: logData.entityId,
        oldData: logData.oldData ? JSON.stringify(logData.oldData) : null,
        newData: logData.newData ? JSON.stringify(logData.newData) : null,
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent,
        userId: logData.userId
      }
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * HIPAA Audit Logging Middleware
 * 
 * This middleware logs all access to PHI resources.
 * Must be applied after authentication middleware.
 */
export function hipaaAuditMiddleware(req, res, next) {
  const startTime = Date.now();
  const { entity, entityId } = parseRequestPath(req.path);
  
  // Check if this is a PHI-related request
  const isPHIAccess = PHI_ENTITIES.some(e => entity.includes(e));
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method to capture response
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // Log PHI access
    if (isPHIAccess || req.method !== 'GET') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: METHOD_ACTION_MAP[req.method] || req.method,
        entity,
        entityId,
        userId: req.user?.id || null,
        userName: req.user?.name || 'Anonymous',
        userRole: req.user?.role || 'Unknown',
        clinicId: req.clinicId || null,
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        path: req.originalUrl,
        method: req.method
      };
      
      // Log to file for compliance
      logger.info(`HIPAA_AUDIT: ${JSON.stringify(logEntry)}`);
      
      // Create database audit log for PHI access
      if (isPHIAccess) {
        createAuditLog({
          action: logEntry.action,
          entity,
          entityId,
          oldData: req.method === 'PUT' || req.method === 'PATCH' ? req.originalBody : null,
          newData: req.method !== 'GET' && req.method !== 'DELETE' ? sanitizeData(req.body) : null,
          ipAddress: logEntry.ipAddress,
          userAgent: logEntry.userAgent,
          userId: logEntry.userId
        });
      }
    }
    
    return originalJson(data);
  };
  
  // Store original body for update operations
  if (req.method === 'PUT' || req.method === 'PATCH') {
    req.originalBody = { ...req.body };
  }
  
  next();
}

/**
 * Log authentication events (login, logout, failed attempts)
 */
export async function logAuthEvent(eventType, userId, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    userId,
    ...details
  };
  
  logger.info(`HIPAA_AUTH: ${JSON.stringify(logEntry)}`);
  
  await createAuditLog({
    action: eventType,
    entity: 'authentication',
    entityId: userId,
    newData: sanitizeData(details),
    ipAddress: details.ipAddress || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId
  });
}

/**
 * Log data export events (reports, bulk downloads)
 */
export async function logDataExport(userId, exportType, recordCount, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: 'DATA_EXPORT',
    exportType,
    recordCount,
    userId,
    ...details
  };
  
  logger.info(`HIPAA_EXPORT: ${JSON.stringify(logEntry)}`);
  
  await createAuditLog({
    action: 'DATA_EXPORT',
    entity: exportType,
    entityId: null,
    newData: { recordCount, ...sanitizeData(details) },
    ipAddress: details.ipAddress || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId
  });
}

/**
 * Log emergency access (break-the-glass scenarios)
 */
export async function logEmergencyAccess(userId, reason, patientId, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: 'EMERGENCY_ACCESS',
    reason,
    patientId,
    userId,
    ...details
  };
  
  logger.warn(`HIPAA_EMERGENCY_ACCESS: ${JSON.stringify(logEntry)}`);
  
  await createAuditLog({
    action: 'EMERGENCY_ACCESS',
    entity: 'patients',
    entityId: patientId,
    newData: { reason, ...sanitizeData(details) },
    ipAddress: details.ipAddress || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId
  });
}

/**
 * Log impersonation / view-as events for audit
 */
export async function logImpersonation(requestingUserId, targetUserId, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: 'VIEW_AS',
    entity: 'dashboard',
    entityId: targetUserId,
    newData: sanitizeData(details) || null,
    ipAddress: details.ipAddress || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId: requestingUserId
  };

  logger.info(`HIPAA_IMPERSONATION: ${JSON.stringify(logEntry)}`);

  await createAuditLog({
    action: 'VIEW_AS',
    entity: 'dashboard',
    entityId: targetUserId,
    newData: details || null,
    ipAddress: details.ipAddress || 'unknown',
    userAgent: details.userAgent || 'unknown',
    userId: requestingUserId
  });
}

export default hipaaAuditMiddleware;

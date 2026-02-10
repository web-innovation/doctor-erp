/**
 * HIPAA Compliance - Session Management
 * 
 * Implements automatic session timeout and secure session handling.
 * 
 * HIPAA Requirements Addressed:
 * - 164.312(a)(2)(iii) - Automatic Logoff
 * - 164.312(d) - Person or Entity Authentication
 */

import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { logger } from '../config/logger.js';
import { logAuthEvent } from './hipaaAudit.js';

// Session configuration
const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 3;
const TOKEN_REFRESH_THRESHOLD_MINUTES = 5;

/**
 * Create a new session for user
 */
export async function createSession(user, req) {
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000);
  
  const token = jwt.sign(
    { 
      userId: user.id,
      sessionId: crypto.randomUUID(),
      role: user.role,
      clinicId: user.clinicId
    },
    process.env.JWT_SECRET,
    { expiresIn: `${SESSION_TIMEOUT_MINUTES}m` }
  );
  
  // Store session in database
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
      device: req.headers['user-agent'] || 'Unknown',
      ipAddress: getClientIP(req)
    }
  });
  
  // Enforce max concurrent sessions
  await enforceMaxSessions(user.id);
  
  // Log session creation
  await logAuthEvent('SESSION_CREATED', user.id, {
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent'],
    expiresAt: expiresAt.toISOString()
  });
  
  return { token, expiresAt };
}

/**
 * Validate and refresh session
 */
export async function validateSession(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists in database
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!session) {
      return { valid: false, error: 'Session not found' };
    }
    
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } });
      return { valid: false, error: 'Session expired' };
    }
    
    // Check if user is still active
    if (!session.user.isActive) {
      await prisma.session.delete({ where: { id: session.id } });
      return { valid: false, error: 'User account is inactive' };
    }
    
    return { 
      valid: true, 
      user: session.user,
      session,
      shouldRefresh: shouldRefreshToken(session.expiresAt)
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Check if token should be refreshed
 */
function shouldRefreshToken(expiresAt) {
  const timeUntilExpiry = expiresAt.getTime() - Date.now();
  const thresholdMs = TOKEN_REFRESH_THRESHOLD_MINUTES * 60 * 1000;
  return timeUntilExpiry < thresholdMs;
}

/**
 * Refresh session (extend expiry)
 */
export async function refreshSession(oldToken, req) {
  const validation = await validateSession(oldToken);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // Delete old session
  await prisma.session.delete({ where: { token: oldToken } });
  
  // Create new session
  const newSession = await createSession(validation.user, req);
  
  await logAuthEvent('SESSION_REFRESHED', validation.user.id, {
    ipAddress: getClientIP(req),
    userAgent: req.headers['user-agent']
  });
  
  return { success: true, ...newSession };
}

/**
 * Invalidate session (logout)
 */
export async function invalidateSession(token, req) {
  try {
    const session = await prisma.session.findUnique({
      where: { token }
    });
    
    if (session) {
      await prisma.session.delete({ where: { token } });
      
      await logAuthEvent('SESSION_INVALIDATED', session.userId, {
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        reason: 'User logout'
      });
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Failed to invalidate session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId, reason = 'Security policy') {
  try {
    const result = await prisma.session.deleteMany({
      where: { userId }
    });
    
    await logAuthEvent('ALL_SESSIONS_INVALIDATED', userId, {
      reason,
      sessionsRemoved: result.count
    });
    
    return { success: true, sessionsRemoved: result.count };
  } catch (error) {
    logger.error('Failed to invalidate all sessions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enforce maximum concurrent sessions
 */
async function enforceMaxSessions(userId) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  if (sessions.length > MAX_CONCURRENT_SESSIONS) {
    // Remove oldest sessions
    const sessionsToRemove = sessions.slice(MAX_CONCURRENT_SESSIONS);
    
    for (const session of sessionsToRemove) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    
    logger.info(`Removed ${sessionsToRemove.length} sessions for user ${userId} (max sessions exceeded)`);
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    
    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired sessions`);
    }
    
    return { success: true, removed: result.count };
  } catch (error) {
    logger.error('Failed to cleanup expired sessions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

/**
 * Session timeout middleware
 * Updates last activity and checks for session timeout
 */
export function sessionTimeoutMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  // Extend session on activity
  prisma.session.update({
    where: { token },
    data: { 
      expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000)
    }
  }).catch(() => {
    // Session might not exist, that's okay
  });
  
  next();
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId) {
  return prisma.session.findMany({
    where: { 
      userId,
      expiresAt: { gt: new Date() }
    },
    select: {
      id: true,
      device: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

// Start periodic session cleanup (every 5 minutes)
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

export default {
  createSession,
  validateSession,
  refreshSession,
  invalidateSession,
  invalidateAllUserSessions,
  cleanupExpiredSessions,
  sessionTimeoutMiddleware,
  getUserSessions,
  SESSION_TIMEOUT_MINUTES
};

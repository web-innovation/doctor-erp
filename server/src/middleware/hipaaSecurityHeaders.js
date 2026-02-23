/**
 * HIPAA Compliance - Security Headers Middleware
 * 
 * Implements additional security headers for HIPAA compliance.
 * 
 * HIPAA Requirements Addressed:
 * - 164.312(e)(1) - Transmission Security
 * - 164.312(e)(2)(ii) - Encryption
 */

/**
 * HIPAA-compliant security headers
 */
export function hipaaSecurityHeaders(req, res, next) {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy - don't leak URLs
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; '));
  
  // Permissions Policy - disable unnecessary features
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()'
  ].join(', '));
  
  // Cache control for sensitive data
  if (req.path.includes('/api/patients') || 
      req.path.includes('/api/prescriptions') ||
      req.path.includes('/api/billing')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

/**
 * HTTPS redirect middleware for production
 */
export function forceHTTPS(req, res, next) {
  const xfProto = (req.get('x-forwarded-proto') || '')
    .toLowerCase()
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const isForwardedHttps = xfProto.includes('https');
  if (process.env.NODE_ENV === 'production' && !req.secure && !isForwardedHttps) {
    // Use 308 so POST/PUT methods and request bodies are preserved across redirects.
    return res.redirect(308, `https://${req.get('host')}${req.url}`);
  }
  next();
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequest(req, res, next) {
  // Remove potentially dangerous fields from body
  if (req.body) {
    delete req.body.__proto__;
    delete req.body.constructor;
    delete req.body.prototype;
  }
  
  // Sanitize query parameters
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        // Remove script tags
        req.query[key] = req.query[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    }
  }
  
  next();
}

export default {
  hipaaSecurityHeaders,
  forceHTTPS,
  sanitizeRequest
};

# DocClinic ERP - HIPAA Compliance Guide

## Overview

This document outlines the HIPAA compliance features implemented in DocClinic ERP and provides guidance for maintaining compliance when handling Protected Health Information (PHI).

## HIPAA Requirements Addressed

### 1. Technical Safeguards (§164.312)

#### a. Access Control (§164.312(a)(1))
- **Unique User Identification**: Each user has a unique ID and login credentials
- **Emergency Access Procedure**: Super Admin can access any clinic in emergencies
- **Automatic Logoff**: Sessions expire after 30 minutes of inactivity (configurable)
- **Encryption and Decryption**: PHI at rest can be encrypted using AES-256-GCM

#### b. Audit Controls (§164.312(b))
- **Comprehensive Audit Logging**: All access to PHI is logged
- **Logged Information**:
  - User ID and name
  - Action performed (VIEW, CREATE, UPDATE, DELETE)
  - Entity type and ID accessed
  - Timestamp
  - IP address
  - User agent/device
- **Log Retention**: Logs are stored in both files and database

#### c. Integrity Controls (§164.312(c)(1))
- **Data Validation**: Input validation on all endpoints
- **Request Sanitization**: XSS and injection prevention
- **Checksums**: Data integrity verification available

#### d. Transmission Security (§164.312(e)(1))
- **HTTPS Required**: Strict Transport Security enforced in production
- **TLS 1.2+**: Modern encryption protocols required
- **Secure Headers**: Content Security Policy, X-Frame-Options, etc.

### 2. Administrative Safeguards (§164.308)

#### a. Security Management (§164.308(a)(1))
- Risk analysis documentation (this document)
- Security policies enforced through code
- Incident response logging

#### b. Workforce Security (§164.308(a)(3))
- Role-based access control (RBAC)
- Minimum necessary access principle
- Account deactivation capability

#### c. Information Access Management (§164.308(a)(4))
- Clinic-level data isolation
- Role hierarchy enforcement
- Access logging and review

#### d. Security Awareness Training (§164.308(a)(5))
- Password complexity requirements
- Password change enforcement (90 days)
- Failed login attempt tracking

### 3. Physical Safeguards (§164.310)
*Note: Physical safeguards depend on deployment environment*
- Cloud provider compliance (AWS, Azure, GCP are HIPAA-eligible)
- Database access restrictions
- Backup encryption

---

## Implementation Details

### Password Policy

The system enforces HIPAA-compliant password requirements:

```
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&* etc.)
- Cannot contain user's name or email
- Cannot be a commonly used password
- Maximum 3 consecutive identical characters
- No sequential characters (1234, abcd)
- Password history: Last 5 passwords remembered
- Password expiration: 90 days
- Account lockout: 5 failed attempts (15-minute lockout)
```

### Data Encryption

PHI can be encrypted at rest using AES-256-GCM:

```javascript
// Example usage
import { encrypt, decrypt } from './utils/encryption.js';

// Encrypt sensitive data before storing
const encryptedSSN = encrypt(patient.ssn);

// Decrypt when needed
const decryptedSSN = decrypt(encryptedSSN);
```

**PHI Fields that should be encrypted:**
- Patient: Aadhar number, PAN number, medical history, allergies
- Staff: Bank account, PAN number, Aadhar number
- Prescriptions: Diagnosis, clinical notes
- Bills: Payment details

### Audit Logging

All PHI access is automatically logged:

```javascript
// Automatic logging via middleware for these entities:
- patients
- prescriptions
- appointments
- bills
- medical-history
- vitals
- health-records
```

**Log Entry Example:**
```json
{
  "timestamp": "2026-02-10T10:30:00.000Z",
  "action": "VIEW",
  "entity": "patients",
  "entityId": "patient-123",
  "userId": "user-456",
  "userName": "Dr. Smith",
  "userRole": "DOCTOR",
  "clinicId": "clinic-789",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "statusCode": 200,
  "duration": "45ms"
}
```

### Session Management

Sessions are managed per HIPAA requirements:

- **Timeout**: 30 minutes of inactivity (configurable)
- **Max Sessions**: 3 concurrent sessions per user
- **Session Storage**: Database with encryption
- **Session Invalidation**: Available for security events

---

## Configuration

### Environment Variables

Add these to your `.env` file for production:

```env
# HIPAA Compliance Configuration
NODE_ENV=production

# Encryption key (REQUIRED) - Generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
HIPAA_ENCRYPTION_KEY=your-64-character-hex-key-here

# Session timeout (minutes)
SESSION_TIMEOUT_MINUTES=30

# Max concurrent sessions
MAX_CONCURRENT_SESSIONS=3

# Strong JWT secret
JWT_SECRET=your-very-long-and-secure-jwt-secret-key
```

### HTTPS Configuration

For production, always use HTTPS:

```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Compliance Checklist

### Before Going to Production

- [ ] HIPAA_ENCRYPTION_KEY is set (64 hex characters)
- [ ] NODE_ENV is set to "production"
- [ ] HTTPS is configured and working
- [ ] Database is encrypted at rest (check cloud provider settings)
- [ ] Backups are encrypted
- [ ] Strong JWT_SECRET is set (at least 256 bits)
- [ ] Rate limiting is enabled
- [ ] Session timeout is configured appropriately
- [ ] All default passwords have been changed
- [ ] Staff have received security training

### Ongoing Compliance

- [ ] Review audit logs weekly
- [ ] Rotate encryption keys annually
- [ ] Update dependencies monthly (security patches)
- [ ] Conduct security assessments quarterly
- [ ] Update risk analysis annually
- [ ] Train new staff on security policies
- [ ] Test backup restoration quarterly
- [ ] Review access privileges monthly

### Incident Response

If a breach is suspected:

1. **Contain**: Disable affected accounts/sessions
2. **Assess**: Review audit logs to determine scope
3. **Notify**: Per HIPAA, notify affected individuals within 60 days
4. **Document**: Record all actions taken
5. **Remediate**: Fix vulnerabilities and update policies

---

## Business Associate Agreement (BAA)

If using cloud services, ensure you have a signed BAA with:
- Cloud provider (AWS, Azure, GCP)
- Any third-party service accessing PHI
- Payment processors
- Email service providers

---

## API Security Headers

The application sets these security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Cache-Control: no-store (for PHI endpoints)
```

---

## Files Implementing HIPAA Features

| File | Purpose |
|------|---------|
| `server/src/middleware/hipaaAudit.js` | PHI access audit logging |
| `server/src/middleware/hipaaSecurityHeaders.js` | Security headers |
| `server/src/middleware/sessionManager.js` | Session timeout management |
| `server/src/utils/encryption.js` | PHI encryption/decryption |
| `server/src/utils/passwordPolicy.js` | Password complexity enforcement |

---

## Support

For HIPAA compliance questions or to report security concerns:
- Email: security@docclinic.com
- Emergency: Contact your designated Security Officer

---

*Last Updated: February 2026*
*Version: 1.0*

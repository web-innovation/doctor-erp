import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './config/logger.js';

// Log only the names of environment variables set at startup (no values)
try {
  console.log('===== ENVIRONMENT VARIABLE NAMES SET =====');
  Object.keys(process.env).sort().forEach((k) => console.log(k));
  console.log('===== END ENVIRONMENT VARIABLE NAMES =====');
} catch (e) {
  console.warn('Failed to list environment variable names', e);
}

// ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HIPAA Compliance imports
import { hipaaAuditMiddleware } from './middleware/hipaaAudit.js';
import { hipaaSecurityHeaders, sanitizeRequest } from './middleware/hipaaSecurityHeaders.js';
import { sessionTimeoutMiddleware } from './middleware/sessionManager.js';
import { validateEncryptionSetup } from './utils/encryption.js';

// Route imports
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import prescriptionRoutes from './routes/prescriptions.js';
import pharmacyRoutes from './routes/pharmacy.js';
import billingRoutes from './routes/billing.js';
import purchasesRoutes from './routes/purchases.js';
import ledgerRoutes from './routes/ledger.js';
import accountsRoutes from './routes/accounts.js';
import staffRoutes from './routes/staff.js';
import reportsRoutes from './routes/reports.js';
import labAgentRoutes from './routes/labsAgents.js';
import dashboardRoutes from './routes/dashboard.js';
import clinicRoutes from './routes/clinic.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
export const prisma = new PrismaClient();
export default app;

// ===========================================
// MIDDLEWARE
// ===========================================

// Security Headers (includes Helmet enhancements)
// In production, relax CSP since we're serving the React app from the same server
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: isProduction ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Required for some frontend assets
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// HIPAA Security Headers
app.use(hipaaSecurityHeaders);
app.use(sanitizeRequest);

// CORS Configuration
// In production, frontend is served from same origin, but allow configured origin as fallback
const corsOrigin = isProduction 
  ? (process.env.CORS_ORIGIN || true) // true allows same-origin
  : (process.env.CORS_ORIGIN || 'http://localhost:5173');

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - stricter for production/HIPAA compliance
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // stricter in production
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health'
});

// Login rate limiting - prevent brute force attacks (HIPAA requirement)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: { error: 'Too many login attempts. Account temporarily locked. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);
app.use('/api/auth/login', loginLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (for HIPAA audit trail)
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Session timeout middleware
app.use(sessionTimeoutMiddleware);

// HIPAA Audit logging middleware
app.use(hipaaAuditMiddleware);

// ===========================================
// API ROUTES
// ===========================================

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/labs-agents', labAgentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'DocClinic ERP API',
    version: '1.0.0'
  });
});

// ===========================================
// SERVE FRONTEND IN PRODUCTION
// ===========================================
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React app
  const clientDistPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  
  // Handle React routing - send all non-API requests to index.html
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  
  logger.info(`Serving frontend from: ${clientDistPath}`);
}

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 handler for API routes only (before main error handler)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Main error handler
app.use(errorHandler);

// ===========================================
// SERVER START
// ===========================================

const PORT = process.env.PORT || 3001;

async function startServer() {
  console.log('Starting DocClinic Server...');
  
  // HIPAA Compliance Check: Validate encryption setup
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.HIPAA_ENCRYPTION_KEY) {
      console.warn('⚠️  WARNING: HIPAA_ENCRYPTION_KEY not set. PHI encryption is disabled.');
      logger.warn('HIPAA_ENCRYPTION_KEY not set. PHI encryption is disabled.');
    } else {
      const encryptionCheck = validateEncryptionSetup();
      if (!encryptionCheck.valid) {
        console.error('❌ HIPAA Encryption validation failed:', encryptionCheck.error);
        logger.error('HIPAA Encryption validation failed:', encryptionCheck.error);
        process.exit(1);
      }
      console.log('✅ HIPAA encryption validated');
      logger.info('HIPAA encryption validated');
    }
  }
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    logger.info('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 DocClinic API Server running on port ${PORT}`);
      console.log(`🔒 HIPAA Compliance Mode: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DEVELOPMENT'}`);
      logger.info(`🚀 DocClinic API Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 HIPAA Compliance Mode: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DEVELOPMENT'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Server shut down gracefully');
  process.exit(0);
});

startServer();

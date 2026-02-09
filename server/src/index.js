import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './config/logger.js';

// Route imports
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import appointmentRoutes from './routes/appointments.js';
import prescriptionRoutes from './routes/prescriptions.js';
import pharmacyRoutes from './routes/pharmacy.js';
import billingRoutes from './routes/billing.js';
import staffRoutes from './routes/staff.js';
import reportsRoutes from './routes/reports.js';
import labAgentRoutes from './routes/labsAgents.js';
import dashboardRoutes from './routes/dashboard.js';
import clinicRoutes from './routes/clinic.js';

const app = express();
export const prisma = new PrismaClient();

// ===========================================
// MIDDLEWARE
// ===========================================

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// ===========================================
// API ROUTES
// ===========================================

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/labs-agents', labAgentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clinic', clinicRoutes);

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
// ERROR HANDLING
// ===========================================

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ===========================================
// SERVER START
// ===========================================

const PORT = process.env.PORT || 3001;

async function startServer() {
  console.log('Starting DocClinic Server...');
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    logger.info('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 DocClinic API Server running on port ${PORT}`);
      logger.info(`🚀 DocClinic API Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
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

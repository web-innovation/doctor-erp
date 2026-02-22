import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useHasPerm } from './context/AuthContext';
import { SessionTimeoutWarning } from './components/common';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Landing Page (keep eagerly loaded for best first paint / SEO crawlability)
import Landing from './pages/Landing';

// Route-level code splitting to reduce homepage JS payload
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/patients/Patients'));
const PatientDetails = lazy(() => import('./pages/patients/PatientDetails'));
const Appointments = lazy(() => import('./pages/appointments/Appointments'));
const AppointmentCalendar = lazy(() => import('./pages/appointments/AppointmentCalendar'));
const Prescriptions = lazy(() => import('./pages/prescriptions/Prescriptions'));
const PrescriptionDetail = lazy(() => import('./pages/prescriptions/PrescriptionDetail'));
const NewPrescription = lazy(() => import('./pages/prescriptions/NewPrescription'));
const Pharmacy = lazy(() => import('./pages/pharmacy/Pharmacy'));
const UploadPurchase = lazy(() => import('./pages/pharmacy/UploadPurchase'));
const Ledger = lazy(() => import('./pages/pharmacy/Ledger'));
const ManualEntry = lazy(() => import('./pages/pharmacy/ManualEntry'));
const Suppliers = lazy(() => import('./pages/pharmacy/Suppliers'));
const Purchases = lazy(() => import('./pages/pharmacy/Purchases'));
const Billing = lazy(() => import('./pages/billing/Billing'));
const NewBill = lazy(() => import('./pages/billing/NewBill'));
const Staff = lazy(() => import('./pages/staff/Staff'));
const Attendance = lazy(() => import('./pages/staff/Attendance'));
const Leave = lazy(() => import('./pages/staff/Leave'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const LabsAgents = lazy(() => import('./pages/labs-agents/LabsAgents'));
const LabTests = lazy(() => import('./pages/labs-agents/LabTests'));
const Settings = lazy(() => import('./pages/settings/Settings'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Clinics = lazy(() => import('./pages/admin/Clinics'));
const ClinicDetail = lazy(() => import('./pages/admin/ClinicDetail'));
const Users = lazy(() => import('./pages/admin/Users'));

const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PatientManagementClinics = lazy(() => import('./pages/features/PatientManagementClinics'));
const PharmacyManagementTricity = lazy(() => import('./pages/features/PharmacyManagementTricity'));
const OnlineReportDashboardClinicsHospitals = lazy(() => import('./pages/features/OnlineReportDashboardClinicsHospitals'));
const SmartPrescriptionDoctors = lazy(() => import('./pages/features/SmartPrescriptionDoctors'));

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userRole = (user?.role || '').toString().toUpperCase();
    const allowed = allowedRoles.map(r => r.toString().toUpperCase());
    if (!allowed.includes(userRole)) return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <>
      {/* HIPAA: Session timeout warning for authenticated users */}
      {user && <SessionTimeoutWarning />}

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        }
      >
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/features/patient-management-system-for-clinics" element={<PatientManagementClinics />} />
      <Route path="/features/pharmacy-management-software-tricity" element={<PharmacyManagementTricity />} />
      <Route path="/features/online-report-dashboard-software-for-clinics-hospitals" element={<OnlineReportDashboardClinicsHospitals />} />
      <Route path="/features/smart-prescription-software-for-doctors" element={<SmartPrescriptionDoctors />} />
      
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Patients */}
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetails />} />
        
        {/* Appointments */}
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/appointments/new" element={<Appointments />} />
        <Route path="/appointments/calendar" element={<AppointmentCalendar />} />
        
        {/* Prescriptions */}
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
        <Route path="/prescriptions/new" element={<NewPrescription />} />
        <Route path="/prescriptions/new/:appointmentId" element={<NewPrescription />} />
        
        {/* Pharmacy */}
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/pharmacy/suppliers" element={<Suppliers />} />
        <Route path="/pharmacy/purchases" element={<Purchases />} />
        <Route path="/pharmacy/upload" element={<UploadPurchase />} />
        {/* Legacy ledger paths: keep redirects for backward compatibility */}
        <Route path="/pharmacy/ledger" element={<Navigate to="/ledger" replace />} />
        <Route path="/pharmacy/ledger/manual" element={<Navigate to="/ledger/manual" replace />} />

        {/* Global Ledger */}
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/ledger/manual" element={<ManualEntry />} />
        
        {/* Billing */}
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing/new" element={<NewBill />} />
        <Route path="/billing/:id/edit" element={<NewBill />} />
        
        {/* Staff Management */}
        <Route path="/staff" element={<Staff />} />
        <Route path="/staff/attendance" element={<Attendance />} />
        <Route path="/staff/leave" element={<Leave />} />
        
        {/* Reports */}
        <Route path="/reports" element={<ReportsRoute />} />
        
        {/* Labs & Agents */}
        <Route path="/labs-agents" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'ADMIN']}>
            <LabsAgents />
          </ProtectedRoute>
        } />
        <Route path="/labs" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'ADMIN']}>
            <LabsAgents />
          </ProtectedRoute>
        } />
        <Route path="/labs-agents/:labId/tests" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'ADMIN']}>
            <LabTests />
          </ProtectedRoute>
        } />

        {/* Separate Agents & Commissions route (not tied to Labs menu) */}
        <Route path="/agents" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'ADMIN']}>
            <LabsAgents />
          </ProtectedRoute>
        } />
        
        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
        
        {/* Profile - redirect to settings */}
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
      </Route>

      {/* Super Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/clinics" element={<Clinics />} />
        <Route path="/admin/clinics/:id" element={<ClinicDetail />} />
        <Route path="/admin/users" element={<Users />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-300">404</h1>
            <p className="text-gray-600 mt-4">Page not found</p>
            <a href="/" className="btn-primary mt-6 inline-block">Go Home</a>
          </div>
        </div>
      } />
    </Routes>
    </Suspense>
    </>
  );
}

// Route wrapper using permission-based check for reports
function ReportsRoute() {
  const canAccess =
    useHasPerm('reports:opd') ||
    useHasPerm('reports:sales') ||
    useHasPerm('reports:pharmacy') ||
    useHasPerm('reports:commissions') ||
    useHasPerm('reports:view', ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']);
  if (!canAccess) return <Navigate to="/dashboard" replace />;
  return <Reports />;
}

export default App;

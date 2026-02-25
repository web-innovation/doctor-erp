import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useHasPerm } from './context/AuthContext';
import { SessionTimeoutWarning } from './components/common';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Landing Page (keep eagerly loaded for best first paint / SEO crawlability)
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Patients from './pages/patients/Patients';
import PatientDetails from './pages/patients/PatientDetails';
import Appointments from './pages/appointments/Appointments';
import AppointmentCalendar from './pages/appointments/AppointmentCalendar';
import Prescriptions from './pages/prescriptions/Prescriptions';
import PrescriptionDetail from './pages/prescriptions/PrescriptionDetail';
import NewPrescription from './pages/prescriptions/NewPrescription';
import Pharmacy from './pages/pharmacy/Pharmacy';
import UploadPurchase from './pages/pharmacy/UploadPurchase';
import Ledger from './pages/pharmacy/Ledger';
import ManualEntry from './pages/pharmacy/ManualEntry';
import Suppliers from './pages/pharmacy/Suppliers';
import Purchases from './pages/pharmacy/Purchases';
import Billing from './pages/billing/Billing';
import NewBill from './pages/billing/NewBill';
import Staff from './pages/staff/Staff';
import Attendance from './pages/staff/Attendance';
import Leave from './pages/staff/Leave';
import Reports from './pages/reports/Reports';
import LabsAgents from './pages/labs-agents/LabsAgents';
import LabTests from './pages/labs-agents/LabTests';
import Settings from './pages/settings/Settings';

// Route-level code splitting to reduce homepage JS payload
const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

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

  useEffect(() => {
    document.documentElement.setAttribute('lang', 'en-GB');

    const preventNumberArrowChange = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === 'number' &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', preventNumberArrowChange, true);
    return () => window.removeEventListener('keydown', preventNumberArrowChange, true);
  }, []);

  // Warm route chunks after login so first menu click does not show full-page suspense loader.
  useEffect(() => {
    if (!user) return;

    const preloadCommonRoutes = async () => {
      try {
        await Promise.allSettled([
          import('./pages/Dashboard'),
          import('./pages/patients/Patients'),
          import('./pages/patients/PatientDetails'),
          import('./pages/appointments/Appointments'),
          import('./pages/appointments/AppointmentCalendar'),
          import('./pages/prescriptions/Prescriptions'),
          import('./pages/prescriptions/NewPrescription'),
          import('./pages/prescriptions/PrescriptionDetail'),
          import('./pages/pharmacy/Pharmacy'),
          import('./pages/pharmacy/Purchases'),
          import('./pages/pharmacy/Suppliers'),
          import('./pages/pharmacy/Ledger'),
          import('./pages/pharmacy/ManualEntry'),
          import('./pages/billing/Billing'),
          import('./pages/billing/NewBill'),
          import('./pages/staff/Staff'),
          import('./pages/staff/Attendance'),
          import('./pages/staff/Leave'),
          import('./pages/reports/Reports'),
          import('./pages/settings/Settings'),
          import('./pages/labs-agents/LabsAgents'),
          import('./pages/labs-agents/LabTests'),
        ]);
      } catch (e) {
        // Non-blocking optimization only.
      }
    };

    const preloadAdminRoutes = async () => {
      const role = (user?.role || '').toString().toUpperCase();
      if (role !== 'SUPER_ADMIN') return;
      try {
        await Promise.allSettled([
          import('./pages/admin/AdminDashboard'),
          import('./pages/admin/Clinics'),
          import('./pages/admin/ClinicDetail'),
          import('./pages/admin/Users'),
        ]);
      } catch (e) {
        // Non-blocking optimization only.
      }
    };

    let idleHandle;
    let timeoutHandle;

    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(() => {
        preloadCommonRoutes();
        preloadAdminRoutes();
      });
    } else {
      timeoutHandle = window.setTimeout(() => {
        preloadCommonRoutes();
        preloadAdminRoutes();
      }, 400);
    }

    return () => {
      if (idleHandle && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle) window.clearTimeout(timeoutHandle);
    };
  }, [user]);

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
        <Route path="/appointments/:id" element={<Appointments />} />
        
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
        <Route path="/billing/:id" element={<Billing />} />
        
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
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

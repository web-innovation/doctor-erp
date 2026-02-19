import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, useHasPerm } from './context/AuthContext';
import { SessionTimeoutWarning } from './components/common';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Dashboard Pages
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
import Billing from './pages/billing/Billing';
import NewBill from './pages/billing/NewBill';
import Staff from './pages/staff/Staff';
import Attendance from './pages/staff/Attendance';
import Leave from './pages/staff/Leave';
import Reports from './pages/reports/Reports';
import LabsAgents from './pages/labs-agents/LabsAgents';
import LabTests from './pages/labs-agents/LabTests';
import Settings from './pages/settings/Settings';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Clinics from './pages/admin/Clinics';
import ClinicDetail from './pages/admin/ClinicDetail';
import Users from './pages/admin/Users';

// Landing Page
import Landing from './pages/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy';

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
      
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      
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
        <Route path="/pharmacy/upload" element={<UploadPurchase />} />
        <Route path="/pharmacy/ledger" element={<Ledger />} />
        
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
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']}>
            <LabsAgents />
          </ProtectedRoute>
        } />
        <Route path="/labs" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']}>
            <LabsAgents />
          </ProtectedRoute>
        } />
        <Route path="/labs-agents/:labId/tests" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']}>
            <LabTests />
          </ProtectedRoute>
        } />

        {/* Separate Agents & Commissions route (not tied to Labs menu) */}
        <Route path="/agents" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']}>
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

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

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
import Billing from './pages/billing/Billing';
import NewBill from './pages/billing/NewBill';
import Staff from './pages/staff/Staff';
import Attendance from './pages/staff/Attendance';
import Leave from './pages/staff/Leave';
import Reports from './pages/reports/Reports';
import LabsAgents from './pages/labs-agents/LabsAgents';
import Settings from './pages/settings/Settings';

// Landing Page
import Landing from './pages/Landing';

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      
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
        <Route path="/appointments/calendar" element={<AppointmentCalendar />} />
        
        {/* Prescriptions */}
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
        <Route path="/prescriptions/new" element={<NewPrescription />} />
        <Route path="/prescriptions/new/:appointmentId" element={<NewPrescription />} />
        
        {/* Pharmacy */}
        <Route path="/pharmacy" element={<Pharmacy />} />
        
        {/* Billing */}
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing/new" element={<NewBill />} />
        
        {/* Staff Management */}
        <Route path="/staff" element={<Staff />} />
        <Route path="/staff/attendance" element={<Attendance />} />
        <Route path="/staff/leave" element={<Leave />} />
        
        {/* Reports */}
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']}>
            <Reports />
          </ProtectedRoute>
        } />
        
        {/* Labs & Agents */}
        <Route path="/labs-agents" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT']}>
            <LabsAgents />
          </ProtectedRoute>
        } />
        
        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
        
        {/* Profile - redirect to settings */}
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
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
  );
}

export default App;

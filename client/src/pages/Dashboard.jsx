import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FaUserInjured,
  FaRupeeSign,
  FaCalendarCheck,
  FaFileInvoice,
  FaPlus,
  FaPrescriptionBottleAlt,
  FaExclamationTriangle,
  FaClock,
  FaArrowRight,
  FaBell,
  FaChartLine,
} from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { dashboardService } from '../services/dashboardService';
import { appointmentService } from '../services/appointmentService';
import { patientService } from '../services/patientService';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StatCard = ({ icon: Icon, title, value, change, changeType, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change && (
          <p className={`text-sm mt-1 ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
            {changeType === 'increase' ? '+' : '-'}{change}% from yesterday
          </p>
        )}
      </div>
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="text-xl text-white" />
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, title, to, color }) => (
  <Link
    to={to}
    className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
  >
    <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
      <Icon className="text-white" />
    </div>
    <span className="font-medium text-gray-700">{title}</span>
    <FaArrowRight className="ml-auto text-gray-400" />
  </Link>
);

const AlertItem = ({ type, message, time }) => {
  const colors = {
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[type]} flex items-start gap-3`}>
      <FaExclamationTriangle className="mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs opacity-75 mt-1">{time}</p>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [dateRange] = useState('7days');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardService.getStats,
    placeholderData: {
      todayOPD: 0,
      totalRevenue: 0,
      appointments: 0,
      pendingBills: 0,
    },
  });

  // Fetch patient trend data
  const { data: patientTrend } = useQuery({
    queryKey: ['patientTrend', dateRange],
    queryFn: () => dashboardService.getPatientTrend(dateRange),
    placeholderData: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [12, 19, 15, 25, 22, 30, 28],
    },
  });

  // Fetch revenue data
  const { data: revenueTrend } = useQuery({
    queryKey: ['revenueTrend', dateRange],
    queryFn: () => dashboardService.getRevenueTrend(dateRange),
    placeholderData: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [5000, 8000, 6500, 9000, 7500, 12000, 10500],
    },
  });

  // Fetch today's appointments
  const { data: todayAppointments } = useQuery({
    queryKey: ['todayAppointments'],
    queryFn: appointmentService.getTodayAppointments,
    placeholderData: [],
  });

  // Fetch recent patients
  const { data: recentPatients } = useQuery({
    queryKey: ['recentPatients'],
    queryFn: () => patientService.getRecent(5),
    placeholderData: [],
  });

  // Fetch alerts
  const { data: alerts } = useQuery({
    queryKey: ['dashboardAlerts'],
    queryFn: dashboardService.getAlerts,
    placeholderData: [],
  });

  const patientChartData = {
    labels: patientTrend?.labels || [],
    datasets: [
      {
        label: 'Patients',
        data: patientTrend?.data || [],
        fill: true,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const revenueChartData = {
    labels: revenueTrend?.labels || [],
    datasets: [
      {
        label: 'Revenue (₹)',
        data: revenueTrend?.data || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, Dr. {user?.name || 'Doctor'}!
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening at your clinic today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FaUserInjured}
            title="Today's OPD"
            value={stats?.data?.appointments?.total || 0}
            change={Math.abs(stats?.data?.appointments?.growth) || 0}
            changeType={stats?.data?.appointments?.growth >= 0 ? 'increase' : 'decrease'}
            color="bg-blue-500"
          />
          <StatCard
            icon={FaRupeeSign}
            title="Today's Revenue"
            value={`₹${(stats?.data?.revenue?.total || 0).toLocaleString()}`}
            change={Math.abs(stats?.data?.revenue?.growth) || 0}
            changeType={stats?.data?.revenue?.growth >= 0 ? 'increase' : 'decrease'}
            color="bg-green-500"
          />
          <StatCard
            icon={FaCalendarCheck}
            title="New Patients"
            value={stats?.data?.patients?.newToday || 0}
            change={stats?.data?.appointments?.completed || 0}
            changeType="increase"
            color="bg-purple-500"
          />
          <StatCard
            icon={FaFileInvoice}
            title="Bills Today"
            value={stats?.data?.bills?.count || 0}
            change={stats?.data?.appointments?.pending || 0}
            changeType="decrease"
            color="bg-orange-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Patient Count</h2>
                <p className="text-sm text-gray-500">Last 7 days trend</p>
              </div>
              <FaChartLine className="text-blue-500" />
            </div>
            <div className="h-64">
              <Line data={patientChartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Revenue</h2>
                <p className="text-sm text-gray-500">Last 7 days</p>
              </div>
              <FaRupeeSign className="text-green-500" />
            </div>
            <div className="h-64">
              <Bar data={revenueChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <QuickAction
              icon={FaCalendarCheck}
              title="New Appointment"
              to="/appointments/new"
              color="bg-blue-500"
            />
            <QuickAction
              icon={FaPrescriptionBottleAlt}
              title="New Prescription"
              to="/prescriptions/new"
              color="bg-purple-500"
            />
            <QuickAction
              icon={FaPlus}
              title="Add Patient"
              to="/patients/new"
              color="bg-green-500"
            />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
              <FaBell className="text-gray-400" />
            </div>
            <div className="space-y-3">
              {alerts?.data?.alerts?.length > 0 ? (
                alerts.data.alerts.map((alert, index) => (
                  <AlertItem key={index} type={alert.type} message={alert.message} time={alert.title} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No alerts at this time</p>
              )}
            </div>
          </div>

          {/* Recent Patients */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Patients</h2>
              <Link to="/patients" className="text-blue-600 text-sm hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recentPatients?.length > 0 ? (
                recentPatients.map((patient) => (
                  <Link
                    key={patient.id}
                    to={`/patients/${patient.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {patient.name?.charAt(0) || 'P'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{patient.name}</p>
                      <p className="text-sm text-gray-500">{patient.phone}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent patients</p>
              )}
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Today's Appointments</h2>
              <Link to="/appointments" className="text-blue-600 text-sm hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {todayAppointments?.length > 0 ? (
                todayAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <FaClock className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{apt.patient?.name || apt.patientName || 'Unknown Patient'}</p>
                      <p className="text-sm text-gray-500">{apt.timeSlot || apt.time || '-'} - {apt.type || 'Consultation'}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      apt.status === 'CONFIRMED' || apt.status === 'confirmed'
                        ? 'bg-green-100 text-green-700' 
                        : apt.status === 'COMPLETED' || apt.status === 'completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status?.toLowerCase() || 'scheduled'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No appointments today</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

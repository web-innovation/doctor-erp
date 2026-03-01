import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers,
  FiHome,
  FiActivity,
  FiDollarSign,
  FiArrowRight,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiUserPlus,
  FiShield,
  FiAlertTriangle,
  FiCpu,
  FiHardDrive,
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import adminService from '../../services/adminService';

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await adminService.getDashboard();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const COLORS = ['#10B981', '#EF4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const clinicStatusData = [
    { name: 'Active', value: stats?.activeClinics || 0 },
    { name: 'Inactive', value: stats?.inactiveClinics || 0 },
  ];

  const revenueGrowth = stats?.lastMonthRevenue > 0
    ? (((stats?.monthlyRevenue - stats?.lastMonthRevenue) / stats?.lastMonthRevenue) * 100).toFixed(1)
    : 0;

  const clinicGrowth = stats?.newClinicsLastMonth > 0
    ? (((stats?.newClinicsThisMonth - stats?.newClinicsLastMonth) / stats?.newClinicsLastMonth) * 100).toFixed(1)
    : stats?.newClinicsThisMonth > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and growth analytics</p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/admin/clinics"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
          >
            <FiHome className="mr-2" /> Manage Clinics
          </Link>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clinics"
          value={stats?.totalClinics || 0}
          icon={FiHome}
          color="blue"
          trend={clinicGrowth > 0 ? 'up' : clinicGrowth < 0 ? 'down' : undefined}
          trendValue={`${Math.abs(clinicGrowth)}% vs last month`}
          subtitle={`${stats?.newClinicsThisMonth || 0} new this month`}
        />
        <StatCard
          title="Active Clinics"
          value={stats?.activeClinics || 0}
          icon={FiActivity}
          color="green"
          subtitle={`${stats?.inactiveClinics || 0} inactive`}
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={FiUsers}
          color="purple"
          subtitle={`${stats?.newUsersThisMonth || 0} new this month`}
        />
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients || 0}
          icon={FiUserPlus}
          color="orange"
          subtitle={`${stats?.newPatientsThisMonth || 0} new this month`}
        />
      </div>

      {/* Subscription & Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Under Subscription"
          value={stats?.subscription?.underSubscriptionCount || 0}
          icon={FiShield}
          color="green"
          subtitle="Active paid clinics"
        />
        <StatCard
          title="Not Opted Subscription"
          value={stats?.subscription?.notOptedSubscriptionCount || 0}
          icon={FiAlertTriangle}
          color="orange"
          subtitle="Trial / not converted"
        />
        <StatCard
          title="Grace Period Clinics"
          value={stats?.subscription?.gracePeriodCount || 0}
          icon={FiActivity}
          color="indigo"
          subtitle="Need renewal follow-up"
        />
        <StatCard
          title="Inactive (30+ days)"
          value={stats?.inactiveUsage?.inactive30Days || 0}
          icon={FiTrendingDown}
          color="red"
          subtitle={`${stats?.inactiveUsage?.inactive7Days || 0} inactive 7+ days`}
        />
      </div>

      {/* Revenue and Appointments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          icon={FiDollarSign}
          color="indigo"
          trend={revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : undefined}
          trendValue={`${Math.abs(revenueGrowth)}% vs last month`}
          subtitle={`Last month: ${formatCurrency(stats?.lastMonthRevenue || 0)}`}
        />
        <StatCard
          title="Today's Appointments"
          value={stats?.todayAppointments || 0}
          icon={FiCalendar}
          color="blue"
          subtitle="Across all clinics"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Growth</h2>
          {stats?.monthlyGrowth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="clinics"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Clinics"
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Users"
                />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="Patients"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No growth data available
            </div>
          )}
        </div>

        {/* Clinic Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinic Status</h2>
          {(stats?.activeClinics > 0 || stats?.inactiveClinics > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={clinicStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {clinicStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No clinic data
            </div>
          )}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h2>
        {stats?.monthlyGrowth?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#8B5CF6" name="Revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No revenue data available
          </div>
        )}
      </div>

      {/* Infrastructure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="AWS Critical Alerts"
          value={stats?.infrastructure?.awsCriticalAlerts || 0}
          icon={FiAlertTriangle}
          color={(stats?.infrastructure?.awsCriticalAlerts || 0) > 0 ? 'red' : 'green'}
          subtitle="Based on failed ingestion signals"
        />
        <StatCard
          title="Instance Uptime"
          value={`${Math.floor((stats?.infrastructure?.instanceUptimeSec || 0) / 3600)}h`}
          icon={FiCpu}
          color="blue"
          subtitle={stats?.infrastructure?.platform || 'Runtime info'}
        />
        <StatCard
          title="Memory Used"
          value={`${stats?.infrastructure?.memoryUsedMb || 0} MB`}
          icon={FiHardDrive}
          color="indigo"
          subtitle={`Draft purchases: ${stats?.draftPurchasesCount || 0}`}
        />
      </div>

      {/* Clinic Inactivity Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Clinic Inactivity (Days Since Last Use)</h2>
          <Link to="/admin/clinics" className="text-purple-600 hover:text-purple-700 text-sm">View all clinics</Link>
        </div>
        {stats?.inactiveClinicsByDays?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-sm font-semibold text-gray-600">Clinic</th>
                  <th className="text-left py-2 text-sm font-semibold text-gray-600">Plan</th>
                  <th className="text-left py-2 text-sm font-semibold text-gray-600">Subscription Status</th>
                  <th className="text-left py-2 text-sm font-semibold text-gray-600">Last Active</th>
                  <th className="text-left py-2 text-sm font-semibold text-gray-600">Days Inactive</th>
                </tr>
              </thead>
              <tbody>
                {stats.inactiveClinicsByDays.map((clinic) => (
                  <tr key={clinic.id} className="border-b border-gray-50">
                    <td className="py-2 text-sm text-gray-900">{clinic.name}</td>
                    <td className="py-2 text-sm text-gray-600">{clinic.planCode || '-'}</td>
                    <td className="py-2 text-sm text-gray-600">{clinic.subscriptionStatus || '-'}</td>
                    <td className="py-2 text-sm text-gray-600">
                      {clinic.lastActiveAt ? new Date(clinic.lastActiveAt).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="py-2 text-sm font-medium text-gray-900">{clinic.daysInactive ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No inactivity data available.</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/clinics"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow flex items-center justify-between group"
        >
          <div>
            <div className="p-2 bg-blue-100 rounded-lg w-fit mb-3">
              <FiHome className="text-blue-600 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Manage Clinics</h3>
            <p className="text-gray-600 text-sm">Add, block, or manage clinics</p>
          </div>
          <FiArrowRight className="text-gray-400 group-hover:text-purple-600 text-xl transition-colors" />
        </Link>

        <Link
          to="/admin/users"
          className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow flex items-center justify-between group"
        >
          <div>
            <div className="p-2 bg-green-100 rounded-lg w-fit mb-3">
              <FiUsers className="text-green-600 text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
            <p className="text-gray-600 text-sm">View users across all clinics</p>
          </div>
          <FiArrowRight className="text-gray-400 group-hover:text-purple-600 text-xl transition-colors" />
        </Link>

        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-sm p-6 text-white">
          <div className="p-2 bg-white/20 rounded-lg w-fit mb-3">
            <FiShield className="text-white text-xl" />
          </div>
          <h3 className="text-lg font-semibold">Platform Health</h3>
          <p className="text-purple-100 text-sm mt-1">
            {stats?.activeUsers || 0} active users
          </p>
          <p className="text-purple-100 text-sm">
            {stats?.activeClinics || 0} active clinics
          </p>
        </div>
      </div>

      {/* Recent Clinics */}
      {stats?.recentClinics?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recently Added Clinics</h2>
            <Link to="/admin/clinics" className="text-purple-600 hover:text-purple-700 text-sm flex items-center">
              View All <FiArrowRight className="ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clinic Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentClinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/admin/clinics/${clinic.id}`}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                      >
                        {clinic.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {clinic.owner?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {clinic.usersCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {clinic.patientsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {new Date(clinic.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          clinic.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {clinic.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

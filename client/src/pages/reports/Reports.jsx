import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  FaDownload,
  FaChartLine,
  FaChartBar,
  FaCalendarAlt,
  FaRupeeSign,
  FaUserMd,
  FaPills,
  FaHandHoldingUsd,
  FaArrowUp,
  FaArrowDown,
} from 'react-icons/fa';
import reportService from '../../services/reportService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TABS = [
  { id: 'sales', label: 'Sales', icon: FaRupeeSign },
  { id: 'opd', label: 'OPD', icon: FaUserMd },
  { id: 'pharmacy', label: 'Pharmacy', icon: FaPills },
  { id: 'commissions', label: 'Commissions', icon: FaHandHoldingUsd },
];

const SummaryCard = ({ title, value, change, changeType, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change !== undefined && (
          <p className={`text-sm mt-1 flex items-center gap-1 ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
            {changeType === 'increase' ? <FaArrowUp className="text-xs" /> : <FaArrowDown className="text-xs" />}
            {Math.abs(change)}% from last period
          </p>
        )}
      </div>
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="text-xl text-white" />
      </div>
    </div>
  </div>
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [groupBy, setGroupBy] = useState('day');

  // Fetch report data based on active tab
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', activeTab, dateRange, groupBy],
    queryFn: () => {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy,
      };

      switch (activeTab) {
        case 'sales':
          return reportService.getSalesReport(params);
        case 'opd':
          return reportService.getOPDReport(params);
        case 'pharmacy':
          return reportService.getPharmacyReport(params);
        case 'commissions':
          return reportService.getCommissionReport(params);
        default:
          return reportService.getSalesReport(params);
      }
    },
  });

  // Extract actual data from response - API returns { success: true, data: {...} }
  const report = reportData?.data || {};

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
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
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  // Generate mock chart data based on date range
  const chartLabels = useMemo(() => {
    const labels = [];
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const current = new Date(start);

    while (current <= end) {
      if (groupBy === 'day') {
        labels.push(current.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
        current.setDate(current.getDate() + 1);
      } else if (groupBy === 'week') {
        labels.push(`Week ${Math.ceil(current.getDate() / 7)}`);
        current.setDate(current.getDate() + 7);
      } else {
        labels.push(current.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
        current.setMonth(current.getMonth() + 1);
      }
    }
    return labels.slice(0, 30);
  }, [dateRange, groupBy]);

  // Sales chart data
  const salesChartData = {
    labels: report.chartData?.labels || chartLabels,
    datasets: [
      {
        label: 'Revenue',
        data: report.chartData?.revenue || chartLabels.map(() => 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // OPD chart data
  const opdChartData = {
    labels: report.chartData?.labels || chartLabels,
    datasets: [
      {
        label: 'New Patients',
        data: report.chartData?.patients || chartLabels.map(() => 0),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'Consultations',
        data: report.chartData?.consultations || chartLabels.map(() => 0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  // Pharmacy chart data
  const pharmacyChartData = {
    labels: report.chartData?.labels || chartLabels,
    datasets: [
      {
        label: 'Sales',
        data: report.chartData?.sales || chartLabels.map(() => 0),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Commission breakdown chart
  const commissionBreakdownData = {
    labels: ['Doctors', 'Agents', 'Labs', 'Others'],
    datasets: [
      {
        data: report.breakdown || [45, 25, 20, 10],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Handle export
  const handleExport = () => {
    // Create CSV data
    const csvContent = [
      ['Report Type', activeTab.toUpperCase()],
      ['Date Range', `${dateRange.startDate} to ${dateRange.endDate}`],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['Date', 'Value'],
      ...chartLabels.map((label, index) => [
        label,
        activeTab === 'sales' 
          ? salesChartData.datasets[0].data[index]
          : activeTab === 'opd'
          ? opdChartData.datasets[0].data[index]
          : pharmacyChartData.datasets[0].data[index],
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-report-${dateRange.startDate}-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Render tab-specific content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales':
        return (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Total Revenue"
                value={formatCurrency(report.totalRevenue || 0)}
                change={report.revenueChange}
                changeType="increase"
                icon={FaRupeeSign}
                color="bg-blue-500"
              />
              <SummaryCard
                title="Total Transactions"
                value={report.totalTransactions || 0}
                change={report.transactionsChange}
                changeType="increase"
                icon={FaChartBar}
                color="bg-green-500"
              />
              <SummaryCard
                title="Average Bill"
                value={formatCurrency(report.avgBill || 0)}
                change={report.avgBillChange}
                changeType="increase"
                icon={FaChartLine}
                color="bg-purple-500"
              />
              <SummaryCard
                title="Outstanding"
                value={formatCurrency(report.outstanding || 0)}
                change={report.outstandingChange}
                changeType="decrease"
                icon={FaRupeeSign}
                color="bg-orange-500"
              />
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <div className="h-80">
                <Line data={salesChartData} options={lineChartOptions} />
              </div>
            </div>
          </>
        );

      case 'opd':
        return (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Total Patients"
                value={report.totalPatients || 0}
                change={report.patientsChange}
                changeType="increase"
                icon={FaUserMd}
                color="bg-blue-500"
              />
              <SummaryCard
                title="Consultations"
                value={report.totalConsultations || 0}
                change={report.consultationsChange}
                changeType="increase"
                icon={FaChartBar}
                color="bg-green-500"
              />
              <SummaryCard
                title="New Patients"
                value={report.newPatients || 0}
                change={report.newPatientsChange}
                changeType="increase"
                icon={FaChartLine}
                color="bg-purple-500"
              />
              <SummaryCard
                title="Revisits"
                value={report.revisits || 0}
                change={report.revisitsChange}
                changeType="increase"
                icon={FaUserMd}
                color="bg-orange-500"
              />
            </div>

            {/* OPD Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient & Consultation Trends</h3>
              <div className="h-80">
                <Bar data={opdChartData} options={barChartOptions} />
              </div>
            </div>
          </>
        );

      case 'pharmacy':
        return (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Total Sales"
                value={formatCurrency(report.totalSales || 0)}
                change={report.salesChange}
                changeType="increase"
                icon={FaRupeeSign}
                color="bg-purple-500"
              />
              <SummaryCard
                title="Transactions"
                value={report.totalTransactions || 0}
                change={report.transactionsChange}
                changeType="increase"
                icon={FaPills}
                color="bg-blue-500"
              />
              <SummaryCard
                title="Low Stock Items"
                value={report.lowStockCount || 0}
                change={report.lowStockChange}
                changeType="decrease"
                icon={FaChartBar}
                color="bg-red-500"
              />
              <SummaryCard
                title="Total Products"
                value={report.totalProducts || 0}
                change={report.productsChange}
                changeType="increase"
                icon={FaChartLine}
                color="bg-green-500"
              />
            </div>

            {/* Pharmacy Sales Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pharmacy Sales Trend</h3>
              <div className="h-80">
                <Line data={pharmacyChartData} options={lineChartOptions} />
              </div>
            </div>
          </>
        );

      case 'commissions':
        // Calculate totals from summary
        const totalCommission = report.summary?.totalCommission || 0;
        const paidCommission = totalCommission - (report.summary?.pendingAmount || 0);
        const pendingCommission = report.summary?.pendingAmount || 0;
        
        return (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Total Commissions"
                value={formatCurrency(totalCommission)}
                change={report.commissionsChange}
                changeType="increase"
                icon={FaHandHoldingUsd}
                color="bg-green-500"
              />
              <SummaryCard
                title="Paid"
                value={formatCurrency(paidCommission)}
                change={report.paidChange}
                changeType="increase"
                icon={FaRupeeSign}
                color="bg-blue-500"
              />
              <SummaryCard
                title="Pending"
                value={formatCurrency(pendingCommission)}
                change={report.pendingChange}
                changeType="decrease"
                icon={FaChartBar}
                color="bg-orange-500"
              />
              <SummaryCard
                title="Total Records"
                value={report.summary?.count || 0}
                change={report.recordsChange}
                changeType="increase"
                icon={FaUserMd}
                color="bg-purple-500"
              />
            </div>

            {/* Commission Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Breakdown</h3>
                <div className="h-64">
                  <Doughnut data={commissionBreakdownData} options={doughnutOptions} />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        L
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">Lab Commissions</p>
                        <p className="text-sm text-gray-500">{report.byLab?.length || 0} labs</p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(report.byLab?.reduce((sum, l) => sum + (l._sum?.amount || 0), 0) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                        A
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">Agent Commissions</p>
                        <p className="text-sm text-gray-500">{report.byAgent?.length || 0} agents</p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(report.byAgent?.reduce((sum, a) => sum + (a._sum?.amount || 0), 0) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-semibold text-sm">
                        P
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">Pending Payments</p>
                        <p className="text-sm text-gray-500">{report.summary?.pendingCount || 0} records</p>
                      </div>
                    </div>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(pendingCommission)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500 mt-1">View detailed reports and insights</p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <FaDownload />
            Export Report
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Range Filter */}
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-gray-400" />
                <span className="text-sm text-gray-600">From:</span>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">To:</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>

              {/* Quick Date Presets */}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setDateRange({
                      startDate: weekAgo.toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0],
                    });
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    setDateRange({
                      startDate: monthAgo.toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0],
                    });
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const threeMonthsAgo = new Date(today);
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    setDateRange({
                      startDate: threeMonthsAgo.toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0],
                    });
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Last 3 Months
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
}

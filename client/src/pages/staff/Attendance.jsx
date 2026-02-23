import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaMinusCircle,
  FaClock,
  FaCalendarDay,
  FaHistory,
  FaEye,
  FaFilter,
} from 'react-icons/fa';
import staffService from '../../services/staffService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Attendance() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [activeTab, setActiveTab] = useState('view'); // 'view', 'mark', or 'monthly'
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // For view tab
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Generate list of years
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  }, []);

  // Fetch staff list
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff', 'all', filterDepartment],
    queryFn: () => staffService.getAll({ limit: 100, department: filterDepartment }),
  });

  const staffList = staffData?.data || [];

  // Fetch attendance for selected date (View and Mark tabs)
  const { data: todayAttendanceData, isLoading: dateAttendanceLoading } = useQuery({
    queryKey: ['attendance-date', selectedDate],
    queryFn: () => staffService.getAttendance({ date: selectedDate, limit: 500 }),
    staleTime: 5000, // 5 seconds
  });

  const todayAttendance = todayAttendanceData?.data || [];

  // Fetch attendance data for month (Monthly view)
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', selectedMonth, selectedYear, filterDepartment],
    queryFn: () =>
      staffService.getAttendance({
        month: selectedMonth + 1,
        year: selectedYear,
        department: filterDepartment,
        limit: 1000, // Fetch all records for the month
      }),
    enabled: activeTab === 'monthly',
  });

  const attendance = attendanceData?.data || [];

  // Calculate summary from today's attendance data
  const calculatedSummary = useMemo(() => {
    const presentCount = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const absentCount = todayAttendance.filter(a => a.status === 'ABSENT').length;
    const leaveCount = todayAttendance.filter(a => a.status === 'ON_LEAVE').length;
    const halfDayCount = todayAttendance.filter(a => a.status === 'HALF_DAY').length;
    const notMarked = staffList.length - todayAttendance.length;
    
    return {
      totalStaff: staffList.length,
      presentToday: presentCount,
      absentToday: absentCount,
      onLeave: leaveCount,
      halfDay: halfDayCount,
      notMarked: notMarked > 0 ? notMarked : 0,
    };
  }, [todayAttendance, staffList]);

  // Get attendance summary from API (for historical data)
  const { data: summaryData } = useQuery({
    queryKey: ['attendance-summary', selectedMonth, selectedYear],
    queryFn: () =>
      staffService.getAttendanceSummary({
        month: selectedMonth + 1,
        year: selectedYear,
      }),
  });

  const summary = calculatedSummary;

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: (data) => staffService.markAttendance(data),
    onSuccess: () => {
      toast.success('Attendance marked successfully');
      // Invalidate all attendance-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['attendance-date', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      // Also refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['attendance-date', selectedDate] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    },
  });

  // Get staff's attendance status for a specific date
  const getStaffStatusForDate = (staffId, dateStr) => {
    const records = (activeTab === 'view' || activeTab === 'mark') ? todayAttendance : attendance;
    const record = records.find((a) => {
      // Handle both ISO string and date objects, accounting for timezone
      const recordDate = new Date(a.date);
      // Format to YYYY-MM-DD in local timezone to avoid UTC shift issues
      const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
      return a.staffId === staffId && recordDateStr === dateStr;
    });
    if (!record?.status) return null;
    const backendToFrontend = {
      'PRESENT': 'present',
      'ABSENT': 'absent',
      'ON_LEAVE': 'leave',
      'HALF_DAY': 'half-day',
      'LATE': 'late'
    };
    return backendToFrontend[record.status] || record.status.toLowerCase();
  };

  // Get attendance status for monthly view
  const getAttendanceStatus = (staffId, day) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return getStaffStatusForDate(staffId, dateStr);
  };

  // Handle attendance marking
  const handleMarkAttendance = (staffId, status, date = selectedDate) => {
    markAttendanceMutation.mutate({
      staffId,
      date: new Date(date).toISOString(),
      status: status.toUpperCase().replace('-', '_').replace('LEAVE', 'ON_LEAVE'),
    });
  };

  // Navigate months
  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Check if day is a Sunday
  const isSunday = (day) => {
    return new Date(selectedYear, selectedMonth, day).getDay() === 0;
  };

  // Check if day is in the future
  const isFutureDate = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return date > todayDate;
  };

  const isLoading = staffLoading || attendanceLoading;

  // Status button component for Today view
  const StatusButton = ({ staffId, currentStatus }) => {
    const statuses = [
      { key: 'present', label: 'Present', color: 'bg-green-500 hover:bg-green-600', activeRing: 'ring-green-500' },
      { key: 'absent', label: 'Absent', color: 'bg-red-500 hover:bg-red-600', activeRing: 'ring-red-500' },
      { key: 'leave', label: 'Leave', color: 'bg-yellow-500 hover:bg-yellow-600', activeRing: 'ring-yellow-500' },
      { key: 'half-day', label: 'Half Day', color: 'bg-blue-500 hover:bg-blue-600', activeRing: 'ring-blue-500' },
    ];

    return (
      <div className="flex flex-wrap gap-2">
        {statuses.map(({ key, label, color, activeRing }) => (
          <button
            key={key}
            onClick={() => handleMarkAttendance(staffId, key)}
            disabled={markAttendanceMutation.isPending}
            className={`
              px-4 py-2 rounded-lg text-white font-medium transition-all text-sm
              ${color}
              ${currentStatus === key 
                ? `ring-2 ring-offset-2 ${activeRing} scale-105` 
                : 'opacity-60 hover:opacity-100'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  // Mini status badge for monthly view
  const StatusBadge = ({ status }) => {
    const styles = {
      present: 'bg-green-500 text-white',
      absent: 'bg-red-500 text-white',
      leave: 'bg-yellow-500 text-white',
      'half-day': 'bg-blue-500 text-white',
    };

    const labels = { present: 'P', absent: 'A', leave: 'L', 'half-day': 'H' };

    return (
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${styles[status] || 'bg-gray-200 text-gray-500'}`}>
        {labels[status] || '-'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Attendance</h1>
            <p className="text-gray-500 mt-1">Track and manage daily attendance records</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaUsers className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalStaff || staffList.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{summary.presentToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FaTimesCircle className="text-red-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Absent Today</p>
                <p className="text-2xl font-bold text-red-600">{summary.absentToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <FaMinusCircle className="text-yellow-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">On Leave</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.onLeave}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'view'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaEye />
              <span>View Attendance</span>
            </button>
            <button
              onClick={() => setActiveTab('mark')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'mark'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaCalendarDay />
              <span>Mark Attendance</span>
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'monthly'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaHistory />
              <span>Monthly View</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'view' ? (
              /* VIEW ATTENDANCE BY DATE */
              <div>
                {/* Date and Filter Selector */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-400" />
                    <input
                      type="date" lang="en-GB" placeholder="dd/mm/yyyy"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="PRESENT">Present Only</option>
                    <option value="ABSENT">Absent Only</option>
                    <option value="ON_LEAVE">On Leave Only</option>
                    <option value="NOT_MARKED">Not Marked</option>
                  </select>
                  {filterStatus && (
                    <button
                      onClick={() => setFilterStatus('')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {/* Quick Stats for Selected Date */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                  <div 
                    className={`text-center p-3 rounded-lg cursor-pointer transition ${filterStatus === '' ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-white hover:bg-blue-50'}`}
                    onClick={() => setFilterStatus('')}
                  >
                    <p className="text-2xl font-bold text-gray-900">{summary.totalStaff}</p>
                    <p className="text-xs text-gray-500">Total Staff</p>
                  </div>
                  <div 
                    className={`text-center p-3 rounded-lg cursor-pointer transition ${filterStatus === 'PRESENT' ? 'bg-green-100 ring-2 ring-green-400' : 'bg-white hover:bg-green-50'}`}
                    onClick={() => setFilterStatus(filterStatus === 'PRESENT' ? '' : 'PRESENT')}
                  >
                    <p className="text-2xl font-bold text-green-600">{summary.presentToday}</p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div 
                    className={`text-center p-3 rounded-lg cursor-pointer transition ${filterStatus === 'ABSENT' ? 'bg-red-100 ring-2 ring-red-400' : 'bg-white hover:bg-red-50'}`}
                    onClick={() => setFilterStatus(filterStatus === 'ABSENT' ? '' : 'ABSENT')}
                  >
                    <p className="text-2xl font-bold text-red-600">{summary.absentToday}</p>
                    <p className="text-xs text-gray-500">Absent</p>
                  </div>
                  <div 
                    className={`text-center p-3 rounded-lg cursor-pointer transition ${filterStatus === 'ON_LEAVE' ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-white hover:bg-yellow-50'}`}
                    onClick={() => setFilterStatus(filterStatus === 'ON_LEAVE' ? '' : 'ON_LEAVE')}
                  >
                    <p className="text-2xl font-bold text-yellow-600">{summary.onLeave}</p>
                    <p className="text-xs text-gray-500">On Leave</p>
                  </div>
                  <div 
                    className={`text-center p-3 rounded-lg cursor-pointer transition ${filterStatus === 'NOT_MARKED' ? 'bg-gray-200 ring-2 ring-gray-400' : 'bg-white hover:bg-gray-100'}`}
                    onClick={() => setFilterStatus(filterStatus === 'NOT_MARKED' ? '' : 'NOT_MARKED')}
                  >
                    <p className="text-2xl font-bold text-gray-600">{summary.notMarked}</p>
                    <p className="text-xs text-gray-500">Not Marked</p>
                  </div>
                </div>

                {/* Staff Attendance List */}
                {staffLoading || dateAttendanceLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <FaUsers className="text-4xl mb-4" />
                    <p className="font-medium">No staff members found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {staffList
                      .map((staff) => {
                        const status = getStaffStatusForDate(staff.id, selectedDate);
                        const backendStatus = status ? status.toUpperCase().replace('-', '_').replace('LEAVE', 'ON_LEAVE') : null;
                        return { staff, status, backendStatus };
                      })
                      .filter(({ backendStatus }) => {
                        if (!filterStatus) return true;
                        if (filterStatus === 'NOT_MARKED') return !backendStatus;
                        return backendStatus === filterStatus;
                      })
                      .map(({ staff, status }) => (
                        <div
                          key={staff.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              status === 'present' ? 'bg-green-500' :
                              status === 'absent' ? 'bg-red-500' :
                              status === 'leave' ? 'bg-yellow-500' :
                              status === 'half-day' ? 'bg-blue-500' :
                              'bg-gray-300'
                            }`}>
                              <span className="text-white font-bold">
                                {staff.name?.charAt(0).toUpperCase() || staff.user?.name?.charAt(0).toUpperCase() || 'S'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{staff.name || staff.user?.name}</p>
                              <p className="text-xs text-gray-500">{staff.designation} • {staff.department}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                            status === 'present' ? 'bg-green-100 text-green-700' :
                            status === 'absent' ? 'bg-red-100 text-red-700' :
                            status === 'leave' ? 'bg-yellow-100 text-yellow-700' :
                            status === 'half-day' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {status ? (status === 'half-day' ? 'Half Day' : status.charAt(0).toUpperCase() + status.slice(1)) : 'Not Marked'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'mark' ? (
              /* MARK ATTENDANCE VIEW */
              <div>
                {/* Date Selector */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-gray-400" />
                    <input
                      type="date" lang="en-GB" placeholder="dd/mm/yyyy"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={today.toISOString().split('T')[0]}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Departments</option>
                    <option value="Administration">Administration</option>
                    <option value="Medical">Medical</option>
                    <option value="Nursing">Nursing</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Reception">Reception</option>
                  </select>
                </div>

                {/* Staff List with Attendance Buttons */}
                {staffLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <FaUsers className="text-4xl mb-4" />
                    <p className="font-medium">No staff members found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffList.map((staff) => {
                      const currentStatus = getStaffStatusForDate(staff.id, selectedDate);
                      return (
                        <div
                          key={staff.id}
                          className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border transition ${
                            currentStatus
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-white border-gray-100 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {staff.name?.charAt(0).toUpperCase() || staff.user?.name?.charAt(0).toUpperCase() || 'S'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{staff.name || staff.user?.name}</p>
                              <p className="text-sm text-gray-500">{staff.designation} • {staff.department}</p>
                            </div>
                            {currentStatus && (
                              <span className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${
                                currentStatus === 'present' ? 'bg-green-100 text-green-700' :
                                currentStatus === 'absent' ? 'bg-red-100 text-red-700' :
                                currentStatus === 'leave' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {currentStatus === 'half-day' ? 'Half Day' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                              </span>
                            )}
                          </div>
                          <StatusButton staffId={staff.id} currentStatus={currentStatus} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* MONTHLY VIEW */
              <div>
                {/* Month/Year Selector */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <FaChevronLeft className="text-gray-600" />
                    </button>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={index}>{month}</option>
                        ))}
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {years.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <FaChevronRight className="text-gray-600" />
                    </button>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">P</span>
                      Present
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">A</span>
                      Absent
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">L</span>
                      Leave
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">H</span>
                      Half Day
                    </span>
                  </div>
                </div>

                {/* Attendance Grid */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <FaUsers className="text-4xl mb-4" />
                    <p className="font-medium">No staff members found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50 min-w-[180px]">
                            Staff
                          </th>
                          {days.map((day) => (
                            <th
                              key={day}
                              className={`px-1 py-3 text-center text-xs font-semibold min-w-[36px] ${
                                isSunday(day) ? 'bg-red-50 text-red-600' : 'text-gray-600'
                              }`}
                            >
                              {day}
                            </th>
                          ))}
                          <th className="px-3 py-3 text-center text-xs font-semibold text-green-600 bg-green-50 min-w-[50px]">P</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 bg-red-50 min-w-[50px]">A</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-yellow-600 bg-yellow-50 min-w-[50px]">L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {staffList.map((staff) => {
                          const staffAttendance = attendance.filter((a) => a.staffId === staff.id);
                          const presentCount = staffAttendance.filter((a) => a.status === 'PRESENT').length;
                          const absentCount = staffAttendance.filter((a) => a.status === 'ABSENT').length;
                          const leaveCount = staffAttendance.filter((a) => a.status === 'ON_LEAVE').length;

                          return (
                            <tr key={staff.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap sticky left-0 bg-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium text-sm">
                                      {staff.name?.charAt(0).toUpperCase() || 'S'}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{staff.name || staff.user?.name}</p>
                                    <p className="text-xs text-gray-500">{staff.designation}</p>
                                  </div>
                                </div>
                              </td>
                              {days.map((day) => {
                                const status = getAttendanceStatus(staff.id, day);
                                const isDisabled = isFutureDate(day);
                                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                                return (
                                  <td
                                    key={day}
                                    className={`px-1 py-2 text-center ${isSunday(day) ? 'bg-red-50' : ''}`}
                                  >
                                    {isDisabled ? (
                                      <span className="text-gray-300">-</span>
                                    ) : status ? (
                                      <button
                                        onClick={() => {
                                          const statuses = ['present', 'absent', 'leave', 'half-day'];
                                          const nextStatus = statuses[(statuses.indexOf(status) + 1) % statuses.length];
                                          handleMarkAttendance(staff.id, nextStatus, dateStr);
                                        }}
                                        className="transition hover:scale-110"
                                        title={`Click to change (currently: ${status})`}
                                      >
                                        <StatusBadge status={status} />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleMarkAttendance(staff.id, 'present', dateStr)}
                                        className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-green-500 hover:text-green-500 hover:bg-green-50 transition text-xs"
                                        title="Click to mark present"
                                      >
                                        +
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-center bg-green-50">
                                <span className="font-bold text-green-600">{presentCount}</span>
                              </td>
                              <td className="px-3 py-2 text-center bg-red-50">
                                <span className="font-bold text-red-600">{absentCount}</span>
                              </td>
                              <td className="px-3 py-2 text-center bg-yellow-50">
                                <span className="font-bold text-yellow-600">{leaveCount}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

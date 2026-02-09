import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaTimes,
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaMinusCircle,
} from 'react-icons/fa';
import staffService from '../../services/staffService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LEAVE: 'leave',
  HALF_DAY: 'half-day',
};

const StatusBadge = ({ status }) => {
  const styles = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    leave: 'bg-yellow-100 text-yellow-700',
    'half-day': 'bg-blue-100 text-blue-700',
  };

  const labels = {
    present: 'P',
    absent: 'A',
    leave: 'L',
    'half-day': 'H',
  };

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {labels[status] || '-'}
    </span>
  );
};

export default function Attendance() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [filterDepartment, setFilterDepartment] = useState('');

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Generate list of years (last 5 years to next year)
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

  // Fetch attendance data
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', selectedMonth, selectedYear, filterDepartment],
    queryFn: () =>
      staffService.getAttendance({
        month: selectedMonth + 1,
        year: selectedYear,
        department: filterDepartment,
      }),
  });

  const attendance = attendanceData?.data || [];

  // Get attendance summary
  const { data: summaryData } = useQuery({
    queryKey: ['attendance-summary', selectedMonth, selectedYear],
    queryFn: () =>
      staffService.getAttendanceSummary({
        month: selectedMonth + 1,
        year: selectedYear,
      }),
  });

  const summary = summaryData || {
    totalStaff: staffList.length,
    presentToday: 0,
    absentToday: 0,
    onLeave: 0,
  };

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: (data) => staffService.markAttendance(data),
    onSuccess: () => {
      toast.success('Attendance marked successfully');
      queryClient.invalidateQueries(['attendance']);
      queryClient.invalidateQueries(['attendance-summary']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    },
  });

  // Get attendance status for a staff on a specific day
  const getAttendanceStatus = (staffId, day) => {
    const record = attendance.find(
      (a) =>
        a.staffId === staffId &&
        new Date(a.date).getDate() === day &&
        new Date(a.date).getMonth() === selectedMonth &&
        new Date(a.date).getFullYear() === selectedYear
    );
    return record?.status || null;
  };

  // Handle attendance marking
  const handleMarkAttendance = (staffId, day, status) => {
    const date = new Date(selectedYear, selectedMonth, day);
    markAttendanceMutation.mutate({
      staffId,
      date: date.toISOString(),
      status,
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const isLoading = staffLoading || attendanceLoading;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaUsers className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-xl font-bold text-gray-900">{summary.totalStaff || staffList.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Present Today</p>
                <p className="text-xl font-bold text-gray-900">{summary.presentToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FaTimesCircle className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Absent Today</p>
                <p className="text-xl font-bold text-gray-900">{summary.absentToday}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FaMinusCircle className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">On Leave</p>
                <p className="text-xl font-bold text-gray-900">{summary.onLeave}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Month/Year Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-gray-400" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
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

            <div className="flex items-center gap-4">
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

              {/* Legend */}
              <div className="hidden lg:flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-semibold">P</span>
                  Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-semibold">A</span>
                  Absent
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-xs font-semibold">L</span>
                  Leave
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">H</span>
                  Half Day
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FaUsers className="text-4xl mb-4" />
              <p className="font-medium">No staff members found</p>
              <p className="text-sm mt-1">Add staff members to track attendance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[200px]">
                      Staff Name
                    </th>
                    {days.map((day) => (
                      <th
                        key={day}
                        className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[40px] ${
                          isSunday(day) ? 'bg-red-50 text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {day}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[60px]">
                      Total P
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[60px]">
                      Total A
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[60px]">
                      Total L
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staffList.map((staff) => {
                    // Calculate totals for this staff
                    const staffAttendance = attendance.filter((a) => a.staffId === staff.id);
                    const presentCount = staffAttendance.filter((a) => a.status === 'present').length;
                    const absentCount = staffAttendance.filter((a) => a.status === 'absent').length;
                    const leaveCount = staffAttendance.filter((a) => a.status === 'leave').length;

                    return (
                      <tr key={staff.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {staff.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{staff.name}</p>
                              <p className="text-xs text-gray-500">{staff.designation}</p>
                            </div>
                          </div>
                        </td>
                        {days.map((day) => {
                          const status = getAttendanceStatus(staff.id, day);
                          const isDisabled = isFutureDate(day);

                          return (
                            <td
                              key={day}
                              className={`px-1 py-2 text-center ${isSunday(day) ? 'bg-red-50' : ''}`}
                            >
                              {isDisabled ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs text-gray-400">
                                  -
                                </span>
                              ) : status ? (
                                <button
                                  onClick={() => {
                                    const statuses = ['present', 'absent', 'leave', 'half-day'];
                                    const currentIndex = statuses.indexOf(status);
                                    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                                    handleMarkAttendance(staff.id, day, nextStatus);
                                  }}
                                  className="transition hover:scale-110"
                                >
                                  <StatusBadge status={status} />
                                </button>
                              ) : (
                                <div className="relative group">
                                  <button
                                    onClick={() => handleMarkAttendance(staff.id, day, 'present')}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs border border-dashed border-gray-300 text-gray-400 hover:border-green-500 hover:text-green-500 hover:bg-green-50 transition"
                                  >
                                    +
                                  </button>
                                  <div className="absolute z-10 hidden group-hover:flex flex-col gap-1 bg-white shadow-lg rounded-lg p-2 top-full left-1/2 -translate-x-1/2 mt-1">
                                    <button
                                      onClick={() => handleMarkAttendance(staff.id, day, 'present')}
                                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                                    >
                                      Present
                                    </button>
                                    <button
                                      onClick={() => handleMarkAttendance(staff.id, day, 'absent')}
                                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                                    >
                                      Absent
                                    </button>
                                    <button
                                      onClick={() => handleMarkAttendance(staff.id, day, 'leave')}
                                      className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                                    >
                                      Leave
                                    </button>
                                    <button
                                      onClick={() => handleMarkAttendance(staff.id, day, 'half-day')}
                                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                    >
                                      Half Day
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-green-600">{presentCount}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-red-600">{absentCount}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-yellow-600">{leaveCount}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

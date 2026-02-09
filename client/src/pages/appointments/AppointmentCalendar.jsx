import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaClock,
  FaUserInjured,
  FaTimes,
} from 'react-icons/fa';
import { appointmentService } from '../../services/appointmentService';
import Modal from '../../components/common/Modal';

const statusColors = {
  scheduled: 'bg-blue-500',
  confirmed: 'bg-indigo-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
  'no-show': 'bg-gray-500',
};

const statusBgColors = {
  scheduled: 'bg-blue-100 border-blue-200',
  confirmed: 'bg-indigo-100 border-indigo-200',
  completed: 'bg-green-100 border-green-200',
  cancelled: 'bg-red-100 border-red-200',
  'no-show': 'bg-gray-100 border-gray-200',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AppointmentCalendar() {
  const [viewMode, setViewMode] = useState('month'); // 'week' or 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Fetch calendar data
  const { data: calendarData, isLoading } = useQuery({
    queryKey: ['calendar', currentMonth + 1, currentYear],
    queryFn: () => appointmentService.getCalendarData(currentMonth + 1, currentYear),
  });

  const appointmentsByDate = calendarData?.data || {};

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Add empty slots for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDate = new Date(currentYear, currentMonth, -startingDayOfWeek + i + 1);
      days.push({
        date: prevMonthDate,
        isCurrentMonth: false,
        dayNumber: prevMonthDate.getDate(),
      });
    }

    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push({
        date,
        isCurrentMonth: true,
        dayNumber: day,
      });
    }

    // Fill remaining slots to complete the grid
    const remainingSlots = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingSlots; i++) {
      const nextMonthDate = new Date(currentYear, currentMonth + 1, i);
      days.push({
        date: nextMonthDate,
        isCurrentMonth: false,
        dayNumber: i,
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  // Generate week days if in week view
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];

    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        date,
        isCurrentMonth: date.getMonth() === currentMonth,
        dayNumber: date.getDate(),
      };
    });
  }, [currentDate, viewMode, currentMonth]);

  const displayDays = viewMode === 'week' ? weekDays : calendarDays;

  const navigatePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getAppointmentsForDate = (date) => {
    const dateKey = formatDateKey(date);
    return appointmentsByDate[dateKey] || [];
  };

  const handleDayClick = (day) => {
    setSelectedDate(day.date);
    setShowDayModal(true);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
            <p className="text-gray-500 mt-1">View and manage appointments on the calendar</p>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {viewMode === 'month'
                  ? `${MONTHS[currentMonth]} ${currentYear}`
                  : `Week of ${currentDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </h2>
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaChevronRight className="text-gray-600" />
              </button>
            </div>

            <button
              onClick={goToToday}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
            >
              Today
            </button>
          </div>

          {/* Status Legend */}
          <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-sm text-gray-500">Status:</span>
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${color}`}></span>
                <span className="text-sm text-gray-600 capitalize">{status}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {[...Array(viewMode === 'week' ? 7 : 35)].map((_, index) => (
                  <div
                    key={index}
                    className="aspect-square p-2 animate-pulse bg-gray-100 rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <div className={`grid grid-cols-7 gap-1 ${viewMode === 'week' ? '' : 'grid-rows-6'}`}>
                {displayDays.map((day, index) => {
                  const appointments = getAppointmentsForDate(day.date);
                  const hasAppointments = appointments.length > 0;
                  const today = isToday(day.date);

                  // Group appointments by status for color indicators
                  const statusCounts = appointments.reduce((acc, apt) => {
                    acc[apt.status] = (acc[apt.status] || 0) + 1;
                    return acc;
                  }, {});

                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(day)}
                      className={`
                        ${viewMode === 'week' ? 'min-h-[150px]' : 'aspect-square'}
                        p-2 rounded-lg cursor-pointer transition-all border
                        ${
                          day.isCurrentMonth
                            ? 'bg-white hover:bg-gray-50'
                            : 'bg-gray-50 text-gray-400'
                        }
                        ${today ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-gray-100'}
                        ${hasAppointments && day.isCurrentMonth ? 'hover:shadow-md' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${
                            today
                              ? 'w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full'
                              : ''
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                        {hasAppointments && day.isCurrentMonth && (
                          <span className="text-xs text-gray-500">{appointments.length}</span>
                        )}
                      </div>

                      {/* Status Indicators */}
                      {hasAppointments && day.isCurrentMonth && (
                        <div className="space-y-1">
                          {Object.entries(statusCounts)
                            .slice(0, viewMode === 'week' ? 5 : 3)
                            .map(([status, count]) => (
                              <div
                                key={status}
                                className={`text-xs px-1.5 py-0.5 rounded truncate ${statusBgColors[status]} border`}
                              >
                                {count} {status}
                              </div>
                            ))}
                          {Object.keys(statusCounts).length > (viewMode === 'week' ? 5 : 3) && (
                            <div className="text-xs text-gray-500 text-center">
                              +{Object.keys(statusCounts).length - (viewMode === 'week' ? 5 : 3)} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Day Details Modal */}
        <Modal
          isOpen={showDayModal}
          onClose={() => setShowDayModal(false)}
          title={
            selectedDate
              ? selectedDate.toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Appointments'
          }
          size="lg"
        >
          <div className="space-y-3">
            {selectedDateAppointments.length === 0 ? (
              <div className="text-center py-8">
                <FaCalendarAlt className="text-4xl text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments scheduled for this day</p>
              </div>
            ) : (
              selectedDateAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`p-4 rounded-lg border ${statusBgColors[appointment.status]}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <FaUserInjured className="text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {appointment.patient?.name || 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {appointment.type || 'Consultation'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        statusColors[appointment.status]
                      } text-white`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <FaClock className="text-gray-400" />
                      {formatTime(appointment.time)}
                    </div>
                    {appointment.patient?.phone && (
                      <div className="flex items-center gap-1">
                        <span>{appointment.patient.phone}</span>
                      </div>
                    )}
                  </div>

                  {appointment.reason && (
                    <p className="mt-2 text-sm text-gray-600 bg-white/50 p-2 rounded">
                      {appointment.reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

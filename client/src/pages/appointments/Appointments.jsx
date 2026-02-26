import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaClock,
  FaUserInjured,
} from 'react-icons/fa';
import { appointmentService } from '../../services/appointmentService';
import { useHasPerm } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-gray-100 text-gray-700',
};

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const typeTabs = [
  { key: 'all', label: 'All Types' },
  { key: 'CONSULTATION', label: 'Consultation' },
  { key: 'FOLLOW_UP', label: 'Follow-up' },
];

const appointmentTypes = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'PROCEDURE', label: 'Procedure' },
  { value: 'EMERGENCY', label: 'Emergency' },
];

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDDMMYYYYToISO = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return '';
  const [, dd, mm, yyyy] = match;
  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  if (!d || !m || !y || m < 1 || m > 12 || d < 1 || d > 31) return '';
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return '';
  }
  return `${yyyy}-${mm}-${dd}`;
};

const isoToDDMMYYYY = (value) => {
  if (!value || typeof value !== 'string' || !value.includes('-')) return '';
  const [yyyy, mm, dd] = value.split('-');
  if (!yyyy || !mm || !dd) return '';
  return `${dd}/${mm}/${yyyy}`;
};

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [showNewModal, setShowNewModal] = useState(
    searchParams.get('action') === 'new' || location.pathname.endsWith('/new')
  );
  const [activeStatus, setActiveStatus] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' }); // dd/mm/yyyy
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPos, setActionMenuPos] = useState(null);
  const pageSize = 10;

  // Handle URL params changes
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || location.pathname.endsWith('/new')) {
      setShowNewModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, location.pathname]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm();

  // Calculate date range based on filter
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      return {
        startDate: toLocalDateString(today),
        endDate: toLocalDateString(today),
      };
    } else if (dateFilter === 'week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7);
      return {
        startDate: toLocalDateString(today),
        endDate: toLocalDateString(weekEnd),
      };
    } else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
      const startIso = parseDDMMYYYYToISO(customDateRange.start);
      const endIso = parseDDMMYYYYToISO(customDateRange.end);
      if (!startIso || !endIso) return {};
      return {
        startDate: startIso,
        endDate: endIso,
      };
    }
    return {};
  };

  // Fetch appointments
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', currentPage, pageSize, activeStatus, activeType, dateFilter, customDateRange, searchQuery],
    queryFn: () =>
      appointmentService.getAppointments({
        page: currentPage,
        limit: pageSize,
        status: activeStatus === 'all' ? undefined : activeStatus,
        type: activeType === 'all' ? undefined : activeType,
        search: searchQuery || undefined,
        ...getDateRange(),
      }),
    placeholderData: (previousData) => previousData,
  });

  const appointments = appointmentsData?.data || [];
  const totalPages = appointmentsData?.pagination?.totalPages || 1;

  // Fetch patients for the dropdown
  const { data: patientsData } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientService.getPatients({ limit: 100 }),
  });

  const patientOptions = (patientsData?.data || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.patientId || `P${String(p.id).padStart(5, '0')}`})`,
  }));

  // Fetch doctors for the doctor dropdown when creating appointment
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => appointmentService.getDoctors(),
    enabled: showNewModal,
  });

  const doctorOptions = (doctorsData?.data || []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: appointmentService.createAppointment,
    onSuccess: () => {
      toast.success('Appointment created successfully');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowNewModal(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create appointment');
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentService.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setActionMenuId(null);
      setActionMenuPos(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  const onSubmit = (data) => {
    const dateIso = parseDDMMYYYYToISO(data.date);
    if (!dateIso) {
      toast.error('Use date format dd/mm/yyyy');
      return;
    }

    // Client-side validation: prevent scheduling in the past
    try {
      if (dateIso && data.time) {
        const apptDt = new Date(`${dateIso}T${data.time}`);
        if (apptDt < new Date()) {
          toast.error('Appointment date and time cannot be in the past');
          return;
        }
      }
    } catch (e) {
      // ignore parse errors and let server-side validation handle
    }

    createMutation.mutate({
      patientId: data.patient?.value,
      date: dateIso,
      timeSlot: data.time,
      type: data.type?.value || 'CONSULTATION',
      symptoms: data.reason,
      notes: data.notes,
      doctorId: data.doctor?.value,
    });
  };

  const handleStatusChange = (id, newStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const getActionItems = (appointment) => {
    const items = [];
    if (appointment.status !== 'COMPLETED') {
      items.push({ key: 'complete', label: 'Mark Completed', status: 'COMPLETED', icon: FaCheck, iconClass: 'text-green-500' });
    }
    if (appointment.status === 'REVIEW') {
      items.push({ key: 'approve', label: 'Approve (Schedule)', status: 'SCHEDULED', icon: FaCheck, iconClass: 'text-green-500' });
      items.push({ key: 'reject', label: 'Reject', status: 'CANCELLED', icon: FaTimes, iconClass: 'text-red-500' });
    }
    if (appointment.status !== 'CANCELLED') {
      items.push({ key: 'cancel', label: 'Cancel', status: 'CANCELLED', icon: FaTimes, iconClass: 'text-red-500' });
    }
    if (appointment.status === 'CANCELLED') {
      items.push({ key: 'reschedule', label: 'Reschedule', status: 'SCHEDULED', icon: FaClock, iconClass: 'text-blue-500' });
    }
    return items;
  };

  const toggleActionMenu = (event, appointment) => {
    if (actionMenuId === appointment.id) {
      setActionMenuId(null);
      setActionMenuPos(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 240;
    const itemCount = getActionItems(appointment).length || 1;
    const menuHeight = Math.max(56, itemCount * 42 + 12);
    const gap = 8;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > viewportW - 8) left = viewportW - menuWidth - 8;

    let top = rect.bottom + gap;
    if (top + menuHeight > viewportH - 8) {
      top = rect.top - menuHeight - gap;
    }
    if (top < 8) top = 8;

    setActionMenuPos({ top, left, width: menuWidth });
    setActionMenuId(appointment.id);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      const target = e.target;
      if (
        target.closest?.('[data-apt-action-trigger]') ||
        target.closest?.('[data-apt-action-menu]')
      ) {
        return;
      }
      setActionMenuId(null);
      setActionMenuPos(null);
    };

    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setActionMenuId(null);
        setActionMenuPos(null);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const canCreate = useHasPerm('appointments:create', ['DOCTOR', 'SUPER_ADMIN', 'RECEPTIONIST']);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-500 mt-1">Manage and schedule patient appointments</p>
          </div>
          {canCreate && (
            <Button iconLeft={FaPlus} onClick={() => setShowNewModal(true)}>
              New Appointment
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customDateRange.start}
                  onChange={(e) =>
                    setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  placeholder="dd/mm/yyyy"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customDateRange.end}
                  onChange={(e) =>
                    setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  placeholder="dd/mm/yyyy"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by patient name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveStatus(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeStatus === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Appointment Type Tabs */}
          <div className="flex gap-2 mt-3">
            {typeTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveType(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeType === tab.key
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Time</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Patient</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                    </tr>
                  ))
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FaUserInjured className="text-4xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No appointments found</p>
                    </td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FaClock className="text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatTime(appointment.timeSlot)}
                            </p>
                            <p className="text-sm text-gray-500">{formatDate(appointment.date)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {appointment.patient?.name?.charAt(0) || 'P'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {appointment.patient?.name || 'Unknown Patient'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {appointment.patient?.phone || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-gray-700">
                          {appointment.type || 'Consultation'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                            statusColors[appointment.status] || statusColors.scheduled
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 relative overflow-visible">
                        <div className="relative inline-block">
                          <button
                            data-apt-action-trigger
                            onClick={(e) => toggleActionMenu(e, appointment)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-sm transition-colors"
                          >
                            <FaClock className="text-blue-600" />
                            Quick Actions
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
          </div>
        )}
      </div>

      {/* Floating Action Menu (fixed, non-clipping) */}
      {actionMenuId && actionMenuPos && (() => {
        const appointment = appointments.find((a) => a.id === actionMenuId);
        if (!appointment) return null;
        const items = getActionItems(appointment);
        return (
          <div
            data-apt-action-menu
            className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[9999]"
            style={{ top: `${actionMenuPos.top}px`, left: `${actionMenuPos.left}px`, width: `${actionMenuPos.width}px` }}
          >
            <div className="px-3 pb-1 mb-1 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</p>
            </div>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => handleStatusChange(appointment.id, item.status)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Icon className={item.iconClass} />
                  {item.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* New Appointment Modal */}
        <Modal
          isOpen={showNewModal}
          onClose={() => {
            setShowNewModal(false);
            reset();
          }}
          title="New Appointment"
          size="lg"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowNewModal(false);
                  reset();
                }}
              >
                Cancel
              </Button>
                  {canCreate ? (
                    <Button
                      onClick={handleSubmit(onSubmit)}
                      loading={createMutation.isPending}
                    >
                      Create Appointment
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled>
                      Permission required
                    </Button>
                  )}
            </>
          }
        >
          <form className="space-y-4">
            <Select
              label="Patient"
              name="patient"
              control={control}
              options={patientOptions}
              placeholder="Search and select patient..."
              rules={{ required: 'Patient is required' }}
              error={errors.patient?.message}
              isSearchable
            />

            <Select
              label="Doctor"
              name="doctor"
              control={control}
              options={doctorOptions}
              placeholder="Select doctor (optional)"
              error={errors.doctor?.message}
              isSearchable
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                helperText={`Today: ${isoToDDMMYYYY(toLocalDateString(new Date()))}`}
                {...register('date', { required: 'Date is required' })}
                error={errors.date?.message}
              />
              <Input
                label="Time"
                type="time"
                {...register('time', { required: 'Time is required' })}
                error={errors.time?.message}
              />
            </div>

            <Select
              label="Appointment Type"
              name="type"
              control={control}
              options={appointmentTypes}
              placeholder="Select type..."
            />

            <Input
              label="Reason for Visit"
              placeholder="Brief description..."
              {...register('reason')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

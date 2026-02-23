import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaPlus,
  FaCheck,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaUserClock,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaFilter,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal';
import { useHasPerm } from '../../context/AuthContext';
import staffService from '../../services/staffService';

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'EARNED', label: 'Earned Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
];

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_ICONS = {
  PENDING: FaClock,
  APPROVED: FaCheckCircle,
  REJECTED: FaTimesCircle,
};

export default function Leave() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const startDateValue = watch('startDate');

  // Fetch staff list for dropdown
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => staffService.getAll({ limit: 100 }),
    staleTime: 30000, // 30 seconds
  });

  const staffList = staffData?.data || [];

  // Permissions
  const canRead = useHasPerm('leaves:read');
  const canCreate = useHasPerm('leaves:create');
  const canUpdate = useHasPerm('leaves:update');

  // Fetch leaves with pagination - also calculate summary from this
  const { data: leavesData, isLoading, error } = useQuery({
    queryKey: ['leaves-list', currentPage, pageSize, filterStatus],
    queryFn: () =>
      staffService.getLeaves({
        page: currentPage,
        limit: pageSize,
        status: filterStatus || undefined,
      }),
    staleTime: 10000, // 10 seconds
  });

  const leaves = leavesData?.data || [];
  const totalPages = leavesData?.pagination?.totalPages || 1;
  const totalCount = leavesData?.pagination?.total || 0;

  // Fetch summary separately only for counts
  const { data: summaryLeavesData } = useQuery({
    queryKey: ['leaves-summary'],
    queryFn: () => staffService.getLeaves({ limit: 500 }),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const allLeaves = summaryLeavesData?.data || [];

  // Calculate summary
  const summary = {
    total: allLeaves.length,
    pending: allLeaves.filter(l => l.status === 'PENDING').length,
    approved: allLeaves.filter(l => l.status === 'APPROVED').length,
    rejected: allLeaves.filter(l => l.status === 'REJECTED').length,
  };

  // If user doesn't have read access, show access denied state
  if (!canRead) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600 mt-2">You don't have permission to view Leave Management.</p>
          </div>
        </div>
      </div>
    );
  }

  // Apply for leave mutation
  const applyMutation = useMutation({
    mutationFn: (data) => staffService.applyLeave(data),
    onSuccess: () => {
      toast.success('Leave application submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['leaves-list'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-summary'] });
      setIsAddModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit leave application');
    },
  });

  // Update leave status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => staffService.updateLeaveStatus(id, { status }),
    onSuccess: (_, variables) => {
      toast.success(`Leave ${variables.status.toLowerCase()} successfully`);
      queryClient.invalidateQueries({ queryKey: ['leaves-list'] });
      queryClient.invalidateQueries({ queryKey: ['leaves-summary'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update leave status');
    },
  });

  const onApplyLeave = (data) => {
    applyMutation.mutate({
      staffId: data.staffId,
      startDate: data.startDate,
      endDate: data.endDate,
      type: data.type,
      reason: data.reason,
    });
  };

  const handleApprove = (leave) => {
    if (!canUpdate) {
      toast.error("You don't have permission to update leave status");
      return;
    }
    if (window.confirm(`Approve leave for ${getStaffName(leave)}?`)) {
      updateStatusMutation.mutate({ id: leave.id, status: 'APPROVED' });
    }
  };

  const handleReject = (leave) => {
    if (!canUpdate) {
      toast.error("You don't have permission to update leave status");
      return;
    }
    if (window.confirm(`Reject leave for ${getStaffName(leave)}?`)) {
      updateStatusMutation.mutate({ id: leave.id, status: 'REJECTED' });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStaffName = (leave) => {
    return leave.staff?.user?.name || leave.staff?.name || 'Unknown Staff';
  };

  const getLeaveTypeLabel = (type) => {
    const found = LEAVE_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-500 mt-1">Review and manage staff leave requests</p>
          </div>
          {canCreate ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <FaPlus />
              Apply Leave
            </button>
          ) : (
            <div className="text-sm text-gray-500">You don't have permission to apply for leave.</div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaCalendarAlt className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer transition hover:border-yellow-300 ${filterStatus === 'PENDING' ? 'ring-2 ring-yellow-400' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'PENDING' ? '' : 'PENDING')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <FaClock className="text-yellow-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer transition hover:border-green-300 ${filterStatus === 'APPROVED' ? 'ring-2 ring-green-400' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'APPROVED' ? '' : 'APPROVED')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
              </div>
            </div>
          </div>
          <div 
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer transition hover:border-red-300 ${filterStatus === 'REJECTED' ? 'ring-2 ring-red-400' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'REJECTED' ? '' : 'REJECTED')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FaTimesCircle className="text-red-600 text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-400" />
              <span className="text-sm text-gray-600">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Requests</option>
                <option value="PENDING">Pending Only</option>
                <option value="APPROVED">Approved Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus('')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Leave Requests List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-500">
              <FaTimesCircle className="text-4xl mb-4" />
              <p className="font-medium">Failed to load leave requests</p>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FaUserClock className="text-4xl mb-4" />
              <p className="font-medium">No leave requests found</p>
              <p className="text-sm mt-1">
                {filterStatus ? 'Try adjusting your filters' : 'Click "Apply Leave" to create the first request'}
              </p>
            </div>
          ) : (
            <>
              {/* Card View for Leave Requests */}
              <div className="divide-y divide-gray-100">
                {leaves.map((leave) => {
                  const StatusIcon = STATUS_ICONS[leave.status] || FaClock;
                  const days = calculateDays(leave.startDate, leave.endDate);
                  
                  return (
                    <div key={leave.id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Staff Info */}
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-lg">
                              {getStaffName(leave).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-lg">{getStaffName(leave)}</p>
                            <p className="text-sm text-gray-500">{leave.staff?.designation || 'Staff'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                                {getLeaveTypeLabel(leave.type)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                                {days} day{days > 1 ? 's' : ''}
                              </span>
                            </div>
                            {leave.reason && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                <span className="font-medium">Reason:</span> {leave.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Status & Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${STATUS_COLORS[leave.status]}`}>
                            <StatusIcon className="text-xs" />
                            {leave.status}
                          </span>
                          
                          {leave.status === 'PENDING' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(leave)}
                                disabled={updateStatusMutation.isPending}
                                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition text-sm"
                              >
                                <FaCheck />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(leave)}
                                disabled={updateStatusMutation.isPending}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition text-sm"
                              >
                                <FaTimes />
                                Reject
                              </button>
                            </div>
                          )}
                          
                          <button
                            onClick={() => setViewModal(leave)}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requests
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <FaChevronLeft className="text-gray-600" />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <FaChevronRight className="text-gray-600" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          reset();
        }}
        title="Apply for Leave"
        size="md"
      >
        <form onSubmit={handleSubmit(onApplyLeave)} className="space-y-4">
          {staffLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No staff members found.</p>
              <p className="text-sm mt-1">Please add staff members first.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Member <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('staffId', { required: 'Staff member is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Staff Member</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.user?.name || staff.name} - {staff.designation || 'Staff'}
                    </option>
                  ))}
                </select>
                {errors.staffId && (
                  <p className="mt-1 text-sm text-red-500">{errors.staffId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('type', { required: 'Leave type is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Leave Type</option>
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date" lang="en-GB" placeholder="dd/mm/yyyy"
                    {...register('startDate', { required: 'Start date is required' })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date" lang="en-GB" placeholder="dd/mm/yyyy"
                    {...register('endDate', { required: 'End date is required' })}
                    min={startDateValue}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  {...register('reason')}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter reason for leave (optional)..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    reset();
                  }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending || staffList.length === 0}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* View Leave Details Modal */}
      <Modal
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
        title="Leave Details"
        size="md"
      >
        {viewModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {getStaffName(viewModal).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-xl">{getStaffName(viewModal)}</p>
                <p className="text-gray-500">{viewModal.staff?.designation || 'Staff'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">Leave Type</p>
                <p className="font-medium text-gray-900">{getLeaveTypeLabel(viewModal.type)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[viewModal.status]}`}>
                  {viewModal.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">{formatDate(viewModal.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium text-gray-900">{formatDate(viewModal.endDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium text-gray-900">{calculateDays(viewModal.startDate, viewModal.endDate)} day(s)</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Applied On</p>
                <p className="font-medium text-gray-900">{formatDate(viewModal.createdAt)}</p>
              </div>
            </div>

            {viewModal.reason && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">Reason</p>
                <p className="text-gray-900">{viewModal.reason}</p>
              </div>
            )}

            {viewModal.status === 'PENDING' && (
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    handleApprove(viewModal);
                    setViewModal(null);
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
                >
                  <FaCheck />
                  Approve Leave
                </button>
                <button
                  onClick={() => {
                    handleReject(viewModal);
                    setViewModal(null);
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition"
                >
                  <FaTimes />
                  Reject Leave
                </button>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setViewModal(null)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

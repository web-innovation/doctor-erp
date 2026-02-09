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
} from 'react-icons/fa';
import Modal from '../../components/common/Modal';
import staffService from '../../services/staffService';

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'EARNED', label: 'Earned Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
];

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function Leave() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Fetch staff list for dropdown
  const { data: staffData } = useQuery({
    queryKey: ['staff', 'all'],
    queryFn: () => staffService.getAll({ limit: 100 }),
  });

  const staffList = staffData?.data || [];

  // Fetch leaves
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves', currentPage, pageSize, filterStatus],
    queryFn: () =>
      staffService.getLeaves({
        page: currentPage,
        limit: pageSize,
        status: filterStatus || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const leaves = leavesData?.data || [];
  const totalPages = leavesData?.pagination?.totalPages || 1;
  const totalCount = leavesData?.pagination?.total || 0;

  // Apply for leave mutation
  const applyMutation = useMutation({
    mutationFn: (data) => staffService.applyLeave(data),
    onSuccess: () => {
      toast.success('Leave application submitted successfully');
      queryClient.invalidateQueries(['leaves']);
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
    onSuccess: () => {
      toast.success('Leave status updated');
      queryClient.invalidateQueries(['leaves']);
      setSelectedLeave(null);
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
    updateStatusMutation.mutate({ id: leave.id, status: 'APPROVED' });
  };

  const handleReject = (leave) => {
    updateStatusMutation.mutate({ id: leave.id, status: 'REJECTED' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-500 mt-1">Manage staff leave requests</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <FaPlus />
            Apply Leave
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Leave Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FaUserClock className="text-4xl mb-4" />
              <p className="font-medium">No leave requests found</p>
              <p className="text-sm mt-1">
                {filterStatus ? 'Try adjusting your filters' : 'No leave applications yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Staff Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Leave Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-medium text-gray-900">
                            {leave.staff?.user?.name || 'Unknown'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-600">{leave.type}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <FaCalendarAlt className="text-gray-400" />
                            <span>
                              {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">
                            {calculateDays(leave.startDate, leave.endDate)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 truncate max-w-xs">
                            {leave.reason || '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                              STATUS_COLORS[leave.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {leave.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(leave)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Approve"
                              >
                                <FaCheck />
                              </button>
                              <button
                                onClick={() => handleReject(leave)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Reject"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requests
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <FaChevronLeft className="text-gray-600" />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member <span className="text-red-500">*</span>
            </label>
            <select
              {...register('staffId', { required: 'Staff member is required' })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Staff</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.user?.name || staff.name}
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
              <option value="">Select Type</option>
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
                type="date"
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
                type="date"
                {...register('endDate', { required: 'End date is required' })}
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
              placeholder="Enter reason for leave..."
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
              disabled={applyMutation.isPending}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

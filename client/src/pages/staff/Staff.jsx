import { useState } from 'react';
import api from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaUserSlash,
  FaUserCheck,
  FaChevronLeft,
  FaChevronRight,
  FaUsers,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal';
import staffService from '../../services/staffService';

const DEPARTMENTS = [
  'Administration',
  'Medical',
  'Nursing',
  'Pharmacy',
  'Laboratory',
  'Reception',
  'Housekeeping',
  'Accounts',
];

const DESIGNATIONS = [
  'Doctor',
  'Nurse',
  'Pharmacist',
  'Lab Technician',
  'Receptionist',
  'Administrator',
  'Accountant',
  'Cleaner',
  'Security',
  'Manager',
];

export default function Staff() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState('');
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm();

  // Fetch staff
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', currentPage, pageSize, searchQuery, filterDepartment],
    queryFn: () =>
      staffService.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        department: filterDepartment,
      }),
    placeholderData: (previousData) => previousData,
  });

  const staffList = staffData?.data || [];
  const totalPages = staffData?.pagination?.totalPages || 1;
  const totalCount = staffData?.pagination?.total || 0;

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: (data) => staffService.create(data),
    onSuccess: () => {
      toast.success('Staff member added successfully');
      queryClient.invalidateQueries(['staff']);
      setIsAddModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add staff member');
    },
  });

  // Update staff mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => staffService.update(id, data),
    onSuccess: () => {
      toast.success('Staff member updated successfully');
      queryClient.invalidateQueries(['staff']);
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      resetEdit();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update staff member');
    },
  });

  // Deactivate staff mutation
  const deactivateMutation = useMutation({
    mutationFn: (id) => staffService.deactivate(id),
    onSuccess: () => {
      toast.success('Staff member deactivated successfully');
      queryClient.invalidateQueries(['staff']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate staff member');
    },
  });

  // Activate staff mutation
  const activateMutation = useMutation({
    mutationFn: (id) => staffService.activate(id),
    onSuccess: () => {
      toast.success('Staff member activated successfully');
      queryClient.invalidateQueries(['staff']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to activate staff member');
    },
  });

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const onAddStaff = (data) => {
    createMutation.mutate({
      ...data,
      salary: data.salary ? parseFloat(data.salary) : undefined,
    });
  };

  const onEditStaff = (data) => {
    if (!selectedStaff) return;
    updateMutation.mutate({
      id: selectedStaff.id,
      data: {
        ...data,
        salary: data.salary ? parseFloat(data.salary) : undefined,
      },
    });
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    // Staff data comes with nested user object
    setEditValue('name', staff.user?.name || staff.name || '');
    setEditValue('email', staff.user?.email || staff.email || '');
    setEditValue('phone', staff.user?.phone || staff.phone || '');
    setEditValue('designation', staff.designation || '');
    setEditValue('department', staff.department || '');
    setEditValue('salary', staff.salary || '');
    setEditValue('joiningDate', staff.joiningDate?.split('T')[0] || '');
    setIsEditModalOpen(true);
  };

  // Reset password modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetModalStaffId, setResetModalStaffId] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  const performResetPassword = async () => {
    try {
      const body = resetPasswordInput ? { newPassword: resetPasswordInput } : {};
      const resp = await api.post(`/staff/${resetModalStaffId}/reset-password`, body);
      const temp = resp.data?.tempPassword;
      alert((resp.data?.message || 'Password updated') + (temp ? `\nTemporary password: ${temp}` : ''));
      setIsResetModalOpen(false);
      setResetPasswordInput('');
      queryClient.invalidateQueries(['staff']);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeactivate = (staff) => {
    const displayName = staff.user?.name || staff.name || staff.employeeId || 'this staff member';
    if (window.confirm(`Are you sure you want to deactivate "${displayName}"?`)) {
      deactivateMutation.mutate(staff.id);
    }
  };

  const handleActivate = (staff) => {
    activateMutation.mutate(staff.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-500 mt-1">Manage employees and their details</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <FaPlus />
            Add Staff
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name, employee ID, or phone..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : staffList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FaUsers className="text-4xl mb-4" />
              <p className="font-medium">No staff members found</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Add your first staff member to get started'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Designation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Phone
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
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-gray-900">
                            {staff.employeeId || 'EMP-' + staff.id?.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {(staff.user?.name || staff.name || 'S').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{staff.user?.name || staff.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{staff.user?.email || staff.email || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-900">{staff.designation || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {staff.department || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {staff.user?.phone || staff.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              (staff.user?.isActive ?? staff.isActive) !== false
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {(staff.user?.isActive ?? staff.isActive) !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(staff)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            {(staff.user?.isActive ?? staff.isActive) !== false ? (
                              <button
                                onClick={() => handleDeactivate(staff)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Deactivate"
                              >
                                <FaUserSlash />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(staff)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                title="Activate"
                              >
                                <FaUserCheck />
                              </button>
                            )}
                            <button
                              onClick={() => { setResetModalStaffId(staff.id); setIsResetModalOpen(true); }}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                              title="Reset Password"
                            >
                              Reset PW
                            </button>
                          </div>
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
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} staff members
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

        {/* Add Staff Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            reset();
          }}
          title="Add Staff Member"
          size="lg"
        >
          <form autoComplete="off" onSubmit={handleSubmit(onAddStaff)} className="space-y-4">
            {/* Hidden fields to deter browser autofill of admin credentials into staff forms */}
            <input type="text" name="fake-username" autoComplete="username" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} />
            <input type="password" name="fake-password" autoComplete="current-password" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  autoComplete="off"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Set initial password (leave blank to auto-generate)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Phone is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('department', { required: 'Department is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-500">{errors.department.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('designation', { required: 'Designation is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Designation</option>
                  {DESIGNATIONS.map((des) => (
                    <option key={des} value={des}>
                      {des}
                    </option>
                  ))}
                </select>
                {errors.designation && (
                  <p className="mt-1 text-sm text-red-500">{errors.designation.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                <input
                  type="number"
                  {...register('salary')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter monthly salary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  {...register('joiningDate')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  {...register('address')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter address"
                />
              </div>
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
                disabled={createMutation.isPending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Staff'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Staff Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedStaff(null);
            resetEdit();
          }}
          title="Edit Staff Member"
          size="lg"
        >
          <form autoComplete="off" onSubmit={handleEditSubmit(onEditStaff)} className="space-y-4">
            {/* Hidden fields to deter browser autofill of admin credentials into staff forms */}
            <input type="text" name="fake-username-edit" autoComplete="username" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} />
            <input type="password" name="fake-password-edit" autoComplete="current-password" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...registerEdit('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...registerEdit('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
                {editErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...registerEdit('phone', { required: 'Phone is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
                {editErrors.phone && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  {...registerEdit('department', { required: 'Department is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {editErrors.department && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.department.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation <span className="text-red-500">*</span>
                </label>
                <select
                  {...registerEdit('designation', { required: 'Designation is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Designation</option>
                  {DESIGNATIONS.map((des) => (
                    <option key={des} value={des}>
                      {des}
                    </option>
                  ))}
                </select>
                {editErrors.designation && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.designation.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                <input
                  type="number"
                  {...registerEdit('salary')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter monthly salary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  {...registerEdit('joiningDate')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-gray-400 text-xs">(optional)</span></label>
                <input
                  type="password"
                  {...registerEdit('password')}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Set new password (leave blank to keep existing)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedStaff(null);
                  resetEdit();
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
        {/* Reset Password Modal */}
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-3">Reset Password</h3>
              <p className="text-sm text-gray-600 mb-3">Enter a new password for the staff member, or leave blank to auto-generate a temporary password.</p>
              <input
                type="password"
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder="New password (optional)"
                className="w-full px-3 py-2 border rounded mb-4"
                autoComplete="new-password"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setIsResetModalOpen(false); setResetPasswordInput(''); }} className="px-3 py-2 border rounded">Cancel</button>
                <button onClick={performResetPassword} className="px-3 py-2 bg-yellow-600 text-white rounded">Reset Password</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

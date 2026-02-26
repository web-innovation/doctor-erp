import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaMale,
  FaFemale,
  FaUserInjured,
  FaTimes,
} from 'react-icons/fa';
import { patientService } from '../../services/patientService';
import { useAuth, useHasPerm } from '../../context/AuthContext';
import settingsService from '../../services/settingsService';
import Modal from '../../components/common/Modal';

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
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
  return `${yyyy}-${mm}-${dd}`;
};

export default function Patients() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get('action') === 'new');
  const [filters, setFilters] = useState({
    gender: '',
    minAge: '',
    maxAge: '',
    fromDate: '',
    toDate: '',
  });
  const pageSize = 10;

  // Handle URL params changes
  const canCreate = useHasPerm('patients:create', ['SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST']);

  useEffect(() => {
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    if (action === 'new') {
      if (canCreate) {
        setIsAddModalOpen(true);
      }
      setSearchParams({}, { replace: true });
    }
    if (search) {
      setSearchQuery(search);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, canCreate]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: patientsData, isLoading, isError } = useQuery({
    queryKey: ['patients', currentPage, pageSize, searchQuery, filters],
    queryFn: () =>
      patientService.getAll({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        ...filters,
      }),
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: (data) => patientService.createPatient(data),
    onSuccess: () => {
      toast.success('Patient added successfully');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsAddModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add patient');
    },
  });

  const onSubmit = (data) => {
    const dateOfBirthIso = data.dateOfBirth ? parseDDMMYYYYToISO(data.dateOfBirth) : '';
    if (data.dateOfBirth && !dateOfBirthIso) {
      toast.error('Date of birth format should be dd/mm/yyyy');
      return;
    }

    // Transform allergies (comma-separated) and medicalHistory (lines) into arrays
    const allergiesArr = data.allergies
      ? data.allergies.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const medHistArr = data.medicalHistory
      ? data.medicalHistory.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;

    createMutation.mutate({
      ...data,
      dateOfBirth: dateOfBirthIso || undefined,
      allergies: allergiesArr,
      medicalHistory: medHistArr,
      insurance: data.insurance ? data.insurance.trim() : undefined,
    });
  };

  const patients = patientsData?.data || [];
  const totalPages = patientsData?.pagination?.totalPages || 1;
  const totalCount = patientsData?.pagination?.total || 0;

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ gender: '', minAge: '', maxAge: '', fromDate: '', toDate: '' });
    setCurrentPage(1);
  };

  const handleRowClick = (patientId) => {
    navigate(`/patients/${patientId}`);
  };

  const getGenderIcon = (gender) => {
    if (gender?.toLowerCase() === 'male') {
      return <FaMale className="text-blue-500" />;
    } else if (gender?.toLowerCase() === 'female') {
      return <FaFemale className="text-pink-500" />;
    }
    return <FaUserInjured className="text-gray-400" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
            <p className="text-gray-500 mt-1">
              Manage and view all patient records
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <FaPlus />
              Add Patient
            </button>
          )}
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name, phone, or patient ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition ${
                showFilters || filters.gender || filters.minAge || filters.maxAge || filters.fromDate || filters.toDate
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaFilter />
              Filters
              {(filters.gender || filters.minAge || filters.maxAge || filters.fromDate || filters.toDate) && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {[filters.gender, filters.minAge, filters.maxAge, filters.fromDate, filters.toDate].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Age
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={filters.minAge}
                    onChange={(e) => handleFilterChange('minAge', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="e.g. 18"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Age
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={filters.maxAge}
                    onChange={(e) => handleFilterChange('maxAge', e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="e.g. 60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    lang="en-GB"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    lang="en-GB"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
                  >
                    <FaTimes />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Patient ID
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Phone
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Age
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Gender
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Last Visit
                  </th>
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
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-red-500 mb-2">Failed to load patients</div>
                      <button
                        onClick={() => window.location.reload()}
                        className="text-blue-600 hover:underline"
                      >
                        Try again
                      </button>
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <FaUserInjured className="text-4xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No patients found</p>
                      {searchQuery && (
                        <p className="text-sm text-gray-400 mt-1">
                          Try adjusting your search or filters
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => handleRowClick(patient.id)}
                      className="border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-blue-600">
                          {patient.patientId || `P${String(patient.id).padStart(5, '0')}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {patient.name?.charAt(0) || 'P'}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{patient.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{patient.phone || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {patient.age ? `${patient.age} yrs` : (patient.dateOfBirth ? `${calculateAge(patient.dateOfBirth)} yrs` : '-')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getGenderIcon(patient.gender)}
                          <span className="text-gray-600 capitalize">
                            {patient.gender || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(patient.lastVisit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && patients.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} patients
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <FaChevronLeft className="text-gray-600" />
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = index + 1;
                  } else if (currentPage <= 3) {
                    pageNum = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + index;
                  } else {
                    pageNum = currentPage - 2 + index;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <FaChevronRight className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); reset(); }}
        title="Add New Patient"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Patient name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('phone', { required: 'Phone is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10-digit phone number"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="text"
                inputMode="numeric"
                {...register('dateOfBirth')}
                placeholder="dd/mm/yyyy"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
              <select
                {...register('bloodGroup')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select blood group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              {...register('address')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full address"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (comma separated)</label>
            <input
              type="text"
              {...register('allergies')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Penicillin, Pollen"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance</label>
            <input
              type="text"
              {...register('insurance')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Insurance provider / policy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medical History (one per line)</label>
            <textarea
              {...register('medicalHistory')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe medical history entries, one per line"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => { setIsAddModalOpen(false); reset(); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

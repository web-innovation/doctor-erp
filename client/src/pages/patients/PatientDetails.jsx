import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaEdit,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaHeartbeat,
  FaPrescriptionBottleAlt,
  FaFileInvoice,
  FaChartLine,
  FaPlus,
  FaAllergies,
  FaNotesMedical,
  FaSpinner,
} from 'react-icons/fa';
import { patientService } from '../../services/patientService';
import { prescriptionService } from '../../services/prescriptionService';
import { useHasPerm } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';

const tabs = [
  { id: 'overview', label: 'Overview', icon: FaUser },
  { id: 'history', label: 'History', icon: FaNotesMedical },
  { id: 'prescriptions', label: 'Prescriptions', icon: FaPrescriptionBottleAlt },
  { id: 'bills', label: 'Bills', icon: FaFileInvoice },
  { id: 'vitals', label: 'Vitals', icon: FaChartLine },
];

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  // Open edit modal when URL ends with /edit
  useEffect(() => {
    if (location.pathname.endsWith('/edit')) {
      setIsEditModalOpen(true);
    }
  }, [location.pathname]);

  // Fetch patient details
  const {
    data: patient,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.getPatient(id),
    enabled: !!id,
  });

  // Reset form when patient data changes
  useEffect(() => {
    if (patient) {
      reset({
        name: patient.name || '',
        phone: patient.phone || '',
        email: patient.email || '',
        gender: patient.gender || '',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
        // Age is auto-calculated from DOB on the client; do not require manual input
        age: patient.age || '',
        bloodGroup: patient.bloodGroup || '',
        address: patient.address || '',
        city: patient.city || '',
        emergencyContact: patient.emergencyContact || '',
        allergies: (patient.allergies && Array.isArray(patient.allergies)) ? patient.allergies.join(', ') : '',
        medicalHistory: (patient.medicalHistory && Array.isArray(patient.medicalHistory)) ? patient.medicalHistory.join('\n') : '',
        insurance: patient.insurance || '',
      });
    }
  }, [patient, reset]);

  // Auto-fill age when dateOfBirth changes
  const dobValue = watch('dateOfBirth');
  useEffect(() => {
    if (!dobValue) return;
    const computed = calculateAge(dobValue);
    if (typeof computed === 'number' && !Number.isNaN(computed)) {
      setValue('age', computed, { shouldValidate: true, shouldDirty: true });
    }
  }, [dobValue, setValue]);

  // Fetch patient prescriptions
  const { data: prescriptions } = useQuery({
    queryKey: ['patientPrescriptions', id],
    queryFn: () => prescriptionService.getByPatientId(id),
    enabled: !!id && activeTab === 'prescriptions',
  });

  // Fetch patient vitals
  const { data: vitals } = useQuery({
    queryKey: ['patientVitals', id],
    queryFn: () => patientService.getVitals(id),
    enabled: !!id && activeTab === 'vitals',
  });

  // Fetch patient bills
  const { data: bills } = useQuery({
    queryKey: ['patientBills', id],
    queryFn: () => patientService.getBills(id),
    enabled: !!id && activeTab === 'bills',
  });

  // Fetch patient history (appointments)
  const { data: history } = useQuery({
    queryKey: ['patientHistory', id],
    queryFn: () => patientService.getHistory(id),
    enabled: !!id && activeTab === 'history',
  });

  // Permission checks (call hooks unconditionally)
  const canCreatePrescription = useHasPerm('prescriptions:create', ['DOCTOR', 'ADMIN', 'SUPER_ADMIN']);
  const canCreateAppointment = useHasPerm('appointments:create', ['DOCTOR', 'SUPER_ADMIN', 'RECEPTIONIST']);

  // Add vitals mutation
  const addVitalsMutation = useMutation({
    mutationFn: (vitalsData) => patientService.addVitals(id, vitalsData),
    onSuccess: () => {
      queryClient.invalidateQueries(['patientVitals', id]);
      toast.success('Vitals added successfully');
    },
    onError: () => {
      toast.error('Failed to add vitals');
    },
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: (data) => patientService.updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['patient', id]);
      queryClient.invalidateQueries(['patients']);
      toast.success('Patient updated successfully');
      setIsEditModalOpen(false);
      navigate(`/patients/${id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update patient');
    },
  });

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    navigate(`/patients/${id}`);
  };

  const onEditSubmit = (data) => {
    const allergiesArr = data.allergies
      ? data.allergies.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const medHistArr = data.medicalHistory
      ? data.medicalHistory.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;

    updatePatientMutation.mutate({
      ...data,
      dateOfBirth: data.dateOfBirth || undefined,
      allergies: allergiesArr,
      medicalHistory: medHistArr,
      insurance: data.insurance || undefined,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return '-';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-blue-600" />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load patient details</p>
          <button
            onClick={() => navigate('/patients')}
            className="text-blue-600 hover:underline"
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/patients')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Patient Details</h1>
            <p className="text-gray-500">
              ID: {patient.patientId || `P${String(patient.id).padStart(5, '0')}`}
            </p>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            <FaEdit />
            Edit Patient
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Patient Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {/* Photo and Basic Info */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {patient.photo ? (
                    <img
                      src={patient.photo}
                      alt={patient.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">
                      {patient.name?.charAt(0) || 'P'}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
                <p className="text-gray-500">
                  {patient.age || calculateAge(patient.dateOfBirth)} years • {patient.gender || 'N/A'}
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <FaPhone className="text-blue-500" />
                  <span>{patient.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaEnvelope className="text-blue-500" />
                  <span>{patient.email || 'No email'}</span>
                </div>
                <div className="flex items-start gap-3 text-gray-600">
                  <FaMapMarkerAlt className="text-blue-500 mt-1" />
                  <span>{patient.address || 'No address'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <FaCalendarAlt className="text-blue-500" />
                  <span>Registered: {formatDate(patient.createdAt)}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                {canCreatePrescription && (
                  <Link
                    to={`/prescriptions/new?patientId=${id}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    <FaPrescriptionBottleAlt />
                    New Prescription
                  </Link>
                )}
                {canCreateAppointment && (
                  <Link
                    to={`/appointments/new?patientId=${id}`}
                    className="w-full inline-flex items-center justify-center gap-2 border border-blue-600 text-blue-600 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition"
                  >
                    <FaCalendarAlt />
                    Book Appointment
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Blood Group</p>
                        <p className="font-medium text-gray-900">{patient.bloodGroup || 'Not recorded'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Date of Birth</p>
                        <p className="font-medium text-gray-900">{formatDate(patient.dateOfBirth)}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Emergency Contact</p>
                        <p className="font-medium text-gray-900">{patient.emergencyContact || 'Not recorded'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">Insurance</p>
                        <p className="font-medium text-gray-900">{patient.insurance || 'Not recorded'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Allergies */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FaAllergies className="text-red-500" />
                        Allergies
                      </h3>
                    </div>
                    {patient.allergies && patient.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {patient.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No known allergies</p>
                    )}
                  </div>

                  {/* Medical History */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical History</h3>
                    {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                      <ul className="space-y-2">
                        {patient.medicalHistory.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <FaHeartbeat className="text-blue-500 mt-1 flex-shrink-0" />
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No medical history recorded</p>
                    )}
                  </div>
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit History</h3>
                  {history?.appointments?.length > 0 ? (
                    <div className="space-y-4">
                      {history.appointments.map((visit, index) => (
                        <Link
                          key={visit.id || index}
                          to={`/appointments/${visit.id}`}
                          className="block p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-gray-900">{visit.reason || 'General Checkup'}</p>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                visit.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-700'
                                  : visit.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {visit.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{formatDate(visit.date)}</p>
                          <p className="text-gray-600 text-sm mt-1">{visit.notes || 'No notes'}</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No visit history available</p>
                  )}
                </div>
              )}

              {/* Prescriptions Tab */}
              {activeTab === 'prescriptions' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Prescriptions</h3>
                    <Link
                      to={`/prescriptions/new?patientId=${id}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <FaPlus />
                      New Prescription
                    </Link>
                  </div>
                  {prescriptions?.length > 0 ? (
                    <div className="space-y-4">
                      {prescriptions.map((prescription) => (
                        <Link
                          key={prescription.id}
                          to={`/prescriptions/${prescription.id}`}
                          className="block p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-gray-900">
                              {prescription.diagnosis || 'Prescription'}
                            </p>
                            <span className="text-sm text-gray-500">
                              {formatDate(prescription.date)}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {prescription.medicines?.length || 0} medicines prescribed
                          </p>
                          <p className="text-sm text-blue-600 mt-2">
                            Dr. {prescription.doctor || 'N/A'}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No prescriptions yet</p>
                  )}
                </div>
              )}

              {/* Bills Tab */}
              {activeTab === 'bills' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bills & Invoices</h3>
                  {bills?.length > 0 ? (
                    <div className="space-y-4">
                      {bills.map((bill) => (
                        <Link
                          key={bill.id}
                          to={`/billing/${bill.id}`}
                          className="block p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-gray-900">Invoice #{bill.billNo}</p>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                bill.paymentStatus === 'PAID'
                                  ? 'bg-green-100 text-green-700'
                                  : bill.paymentStatus === 'PARTIAL'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {bill.paymentStatus}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">{formatDate(bill.date)}</p>
                          <p className="font-semibold text-gray-900 mt-2">
                            ₹{bill.totalAmount?.toLocaleString() || 0}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No bills generated</p>
                  )}
                </div>
              )}

              {/* Vitals Tab */}
              {activeTab === 'vitals' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Vitals Record</h3>
                    <button
                      onClick={() => {
                        // This would typically open a modal - for now using sample data
                        const vitalsData = {
                          bloodPressure: '120/80',
                          pulse: 72,
                          temperature: 98.6,
                          weight: 70,
                          height: 170,
                          spO2: 98,
                        };
                        addVitalsMutation.mutate(vitalsData);
                      }}
                      disabled={addVitalsMutation.isPending}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {addVitalsMutation.isPending ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaPlus />
                      )}
                      Add Vitals
                    </button>
                  </div>
                  {vitals?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                              Date
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                              BP
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                              Pulse
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                              Temp
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                              Weight
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                              Height
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                              SpO2
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {vitals.map((vital, index) => (
                            <tr key={vital.id || index} className="border-b border-gray-50">
                              <td className="py-3 px-4 text-gray-900">
                                {formatDate(vital.recordedAt)}
                              </td>
                              <td className="py-3 px-4 text-gray-600">{vital.bloodPressure || '-'}</td>
                              <td className="py-3 px-4 text-gray-600">
                                {vital.pulse ? `${vital.pulse} bpm` : '-'}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {vital.temperature ? `${vital.temperature}°F` : '-'}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {vital.weight ? `${vital.weight} kg` : '-'}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {vital.height ? `${vital.height} cm` : '-'}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {vital.spO2 ? `${vital.spO2}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No vitals recorded</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Patient"
        size="lg"
      >
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                {...register('phone', { required: 'Phone is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                {...register('dateOfBirth')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allergies (comma separated)</label>
              <input
                type="text"
                {...register('allergies')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Penicillin, Pollen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance</label>
              <input
                type="text"
                {...register('insurance')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Insurance provider / policy"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical History (one per line)</label>
              <textarea
                {...register('medicalHistory')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe medical history entries, one per line"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group
              </label>
              <select
                {...register('bloodGroup')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Blood Group</option>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                {...register('city')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                {...register('address')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                {...register('emergencyContact')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatePatientMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {updatePatientMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

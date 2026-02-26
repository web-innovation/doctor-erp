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
  FaFileMedical,
  FaUpload,
} from 'react-icons/fa';
import { patientService } from '../../services/patientService';
import { prescriptionService } from '../../services/prescriptionService';
import { useHasPerm } from '../../context/AuthContext';
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

const isoToDDMMYYYY = (value) => {
  if (!value || typeof value !== 'string' || !value.includes('-')) return '';
  const [yyyy, mm, dd] = value.split('T')[0].split('-');
  if (!yyyy || !mm || !dd) return '';
  return `${dd}/${mm}/${yyyy}`;
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: FaUser },
  { id: 'history', label: 'History', icon: FaNotesMedical },
  { id: 'prescriptions', label: 'Prescriptions', icon: FaPrescriptionBottleAlt },
  { id: 'documents', label: 'Documents', icon: FaFileMedical },
  { id: 'bills', label: 'Bills', icon: FaFileInvoice },
  { id: 'vitals', label: 'Vitals', icon: FaChartLine },
];

const tabDescriptions = {
  overview: 'Profile and medical summary',
  history: 'Visits and timeline',
  prescriptions: 'Issued medicines',
  documents: 'Reports and uploads',
  bills: 'Invoices and payments',
  vitals: 'Trends and records',
};

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentCategory, setDocumentCategory] = useState('OTHER');
  const [documentNotes, setDocumentNotes] = useState('');
  const [vitalsForm, setVitalsForm] = useState({
    bloodPressure: '',
    pulse: '',
    temperature: '',
    weight: '',
    height: '',
    spO2: '',
    bloodSugar: '',
    notes: '',
  });
  
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
        gender: patient.gender ? String(patient.gender).toUpperCase() : '',
        dateOfBirth: patient.dateOfBirth ? isoToDDMMYYYY(patient.dateOfBirth) : '',
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

  const { data: documents } = useQuery({
    queryKey: ['patientDocuments', id],
    queryFn: () => patientService.getDocuments(id),
    enabled: !!id && activeTab === 'documents',
  });

  // Permission checks (call hooks unconditionally)
  const canCreatePrescription = useHasPerm('prescriptions:create', ['DOCTOR', 'ADMIN', 'SUPER_ADMIN']);
  const canCreateAppointment = useHasPerm('appointments:create', ['DOCTOR', 'SUPER_ADMIN', 'RECEPTIONIST']);

  // Add vitals mutation
  const addVitalsMutation = useMutation({
    mutationFn: (vitalsData) => patientService.addVitals(id, vitalsData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientVitals', id] });
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
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient updated successfully');
      setIsEditModalOpen(false);
      navigate(`/patients/${id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update patient');
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (payload) => patientService.uploadDocument(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments', id] });
      toast.success('Document uploaded');
      setDocumentFile(null);
      setDocumentTitle('');
      setDocumentCategory('OTHER');
      setDocumentNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    },
  });

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    navigate(`/patients/${id}`);
  };

  const onEditSubmit = (data) => {
    const dateOfBirthIso = data.dateOfBirth ? parseDDMMYYYYToISO(data.dateOfBirth) : '';
    if (data.dateOfBirth && !dateOfBirthIso) {
      toast.error('Date of birth format should be dd/mm/yyyy');
      return;
    }

    const allergiesArr = data.allergies
      ? data.allergies.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const medHistArr = data.medicalHistory
      ? data.medicalHistory.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;

    updatePatientMutation.mutate({
      ...data,
      dateOfBirth: dateOfBirthIso || undefined,
      allergies: allergiesArr,
      medicalHistory: medHistArr,
      insurance: data.insurance ? data.insurance.trim() : null,
    });
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
    if (!dob) return '-';
    const parsedIso = dob.includes('/') ? parseDDMMYYYYToISO(dob) : dob;
    if (!parsedIso) return '-';
    const today = new Date();
    const birthDate = new Date(parsedIso);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getLatestVital = (key) => {
    if (!vitals?.length) return null;
    return vitals.find((entry) => entry[key] !== null && entry[key] !== undefined && entry[key] !== '');
  };

  const getVitalBadge = (type, value) => {
    if (value === null || value === undefined || value === '') {
      return { label: 'No data', className: 'bg-gray-100 text-gray-600' };
    }
    if (type === 'spO2') {
      if (Number(value) >= 95) return { label: 'Normal', className: 'bg-green-100 text-green-700' };
      if (Number(value) >= 90) return { label: 'Low', className: 'bg-yellow-100 text-yellow-700' };
      return { label: 'Critical', className: 'bg-red-100 text-red-700' };
    }
    if (type === 'pulse') {
      if (Number(value) >= 60 && Number(value) <= 100) return { label: 'Normal', className: 'bg-green-100 text-green-700' };
      return { label: 'Review', className: 'bg-yellow-100 text-yellow-700' };
    }
    if (type === 'temperature') {
      if (Number(value) >= 97 && Number(value) <= 99) return { label: 'Normal', className: 'bg-green-100 text-green-700' };
      if (Number(value) > 99) return { label: 'Fever', className: 'bg-red-100 text-red-700' };
      return { label: 'Low', className: 'bg-yellow-100 text-yellow-700' };
    }
    return { label: 'Recorded', className: 'bg-blue-100 text-blue-700' };
  };

  const submitVitals = () => {
    const payload = {
      bloodPressure: vitalsForm.bloodPressure || null,
      pulse: vitalsForm.pulse ? Number(vitalsForm.pulse) : null,
      temperature: vitalsForm.temperature ? Number(vitalsForm.temperature) : null,
      weight: vitalsForm.weight ? Number(vitalsForm.weight) : null,
      height: vitalsForm.height ? Number(vitalsForm.height) : null,
      spO2: vitalsForm.spO2 ? Number(vitalsForm.spO2) : null,
      bloodSugar: vitalsForm.bloodSugar ? Number(vitalsForm.bloodSugar) : null,
      notes: vitalsForm.notes || null,
    };

    addVitalsMutation.mutate(payload, {
      onSuccess: () => {
        setVitalsForm({
          bloodPressure: '',
          pulse: '',
          temperature: '',
          weight: '',
          height: '',
          spO2: '',
          bloodSugar: '',
          notes: '',
        });
        setShowVitalsForm(false);
      },
    });
  };

  const latestPulse = getLatestVital('pulse');
  const latestSpO2 = getLatestVital('spO2');
  const latestTemp = getLatestVital('temperature');
  const latestBp = getLatestVital('bloodPressure');
  const pulseBadge = getVitalBadge('pulse', latestPulse?.pulse);
  const spO2Badge = getVitalBadge('spO2', latestSpO2?.spO2);
  const tempBadge = getVitalBadge('temperature', latestTemp?.temperature);
  const prescriptionsList = Array.isArray(prescriptions)
    ? prescriptions
    : (Array.isArray(prescriptions?.data) ? prescriptions.data : []);
  const documentsList = Array.isArray(documents) ? documents : (Array.isArray(documents?.data) ? documents.data : []);

  const getPrescriptionTitle = (prescription) => {
    const diagnosis = prescription?.diagnosis;
    if (Array.isArray(diagnosis)) return diagnosis.filter(Boolean).join(', ') || 'Prescription';
    if (typeof diagnosis === 'string') {
      const trimmed = diagnosis.trim();
      if (!trimmed) return 'Prescription';
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) return parsed.filter(Boolean).join(', ') || 'Prescription';
          if (typeof parsed === 'string') return parsed || 'Prescription';
        } catch (e) {
          // Use original diagnosis when JSON parsing fails.
        }
      }
      return trimmed;
    }
    return 'Prescription';
  };

  const getPrescriptionDoctorName = (prescription) => {
    const doctor = prescription?.doctor;
    if (!doctor) return 'N/A';
    if (typeof doctor === 'string') return doctor;
    if (typeof doctor === 'object') return doctor.name || doctor.fullName || 'N/A';
    return 'N/A';
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

  const submitDocument = () => {
    if (!documentFile) {
      toast.error('Please select a file');
      return;
    }
    uploadDocumentMutation.mutate({
      file: documentFile,
      title: documentTitle,
      category: documentCategory,
      notes: documentNotes,
    });
  };

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
              <div className="p-3">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-left rounded-xl border px-3 py-3 transition min-h-[88px] ${
                      activeTab === tab.id
                        ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${
                          activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <tab.icon className="text-sm" />
                      </span>
                      <span className="font-semibold text-sm leading-5 break-words">{tab.label}</span>
                    </div>
                    <p className="mt-2 text-xs leading-4 text-gray-500">{tabDescriptions[tab.id]}</p>
                  </button>
                ))}
                </div>
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
                        <div
                          key={visit.id || index}
                          className="block p-4 border border-gray-100 rounded-lg bg-white"
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
                        </div>
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
                  {prescriptionsList.length > 0 ? (
                    <div className="space-y-4">
                      {prescriptionsList.map((prescription) => (
                        <Link
                          key={prescription.id}
                          to={`/prescriptions/${prescription.id}`}
                          className="block p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-gray-900">
                              {getPrescriptionTitle(prescription)}
                            </p>
                            <span className="text-sm text-gray-500">
                              {formatDate(prescription.date || prescription.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {prescription.medicines?.length || 0} medicines prescribed
                          </p>
                          <p className="text-sm text-blue-600 mt-2">
                            Dr. {getPrescriptionDoctorName(prescription)}
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
              {activeTab === 'documents' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Patient Documents</h3>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Upload supporting documents (lab report, ultrasound, referral, etc.)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="file"
                        onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        placeholder="Document title (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <select
                        value={documentCategory}
                        onChange={(e) => setDocumentCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="LAB_REPORT">Lab Report</option>
                        <option value="ULTRASOUND">Ultrasound</option>
                        <option value="PRESCRIPTION">Prescription</option>
                        <option value="OTHER">Other</option>
                      </select>
                      <input
                        type="text"
                        value={documentNotes}
                        onChange={(e) => setDocumentNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end mt-3">
                      <button
                        type="button"
                        onClick={submitDocument}
                        disabled={uploadDocumentMutation.isPending}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {uploadDocumentMutation.isPending ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                        Upload
                      </button>
                    </div>
                  </div>

                  {documentsList.length > 0 ? (
                    <div className="space-y-3">
                      {documentsList.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.accessUrl || doc.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="block p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-gray-900">{doc.title || doc.fileName}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {doc.category || 'OTHER'} • {formatDate(doc.uploadedAt)}
                              </p>
                              {doc.notes ? <p className="text-sm text-gray-500 mt-1">{doc.notes}</p> : null}
                            </div>
                            <span className="text-sm text-blue-600">Open</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
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
                      onClick={() => setShowVitalsForm((v) => !v)}
                      disabled={addVitalsMutation.isPending}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <FaPlus />
                      {showVitalsForm ? 'Close Form' : 'Add Vitals'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-lg border border-gray-200 p-3 bg-white">
                      <p className="text-xs text-gray-500">Latest BP</p>
                      <p className="text-lg font-semibold text-gray-900">{latestBp?.bloodPressure || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 bg-white">
                      <p className="text-xs text-gray-500">Latest Pulse</p>
                      <p className="text-lg font-semibold text-gray-900">{latestPulse?.pulse ? `${latestPulse.pulse} bpm` : '-'}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs ${pulseBadge.className}`}>{pulseBadge.label}</span>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 bg-white">
                      <p className="text-xs text-gray-500">Latest Temperature</p>
                      <p className="text-lg font-semibold text-gray-900">{latestTemp?.temperature ? `${latestTemp.temperature} F` : '-'}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs ${tempBadge.className}`}>{tempBadge.label}</span>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3 bg-white">
                      <p className="text-xs text-gray-500">Latest SpO2</p>
                      <p className="text-lg font-semibold text-gray-900">{latestSpO2?.spO2 ? `${latestSpO2.spO2}%` : '-'}</p>
                      <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs ${spO2Badge.className}`}>{spO2Badge.label}</span>
                    </div>
                  </div>

                  {showVitalsForm && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Vitals help track trends between visits and flag issues early.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="BP (e.g. 120/80)" value={vitalsForm.bloodPressure} onChange={(e) => setVitalsForm((s) => ({ ...s, bloodPressure: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" inputMode="numeric" placeholder="Pulse" value={vitalsForm.pulse} onChange={(e) => setVitalsForm((s) => ({ ...s, pulse: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" inputMode="decimal" placeholder="Temperature (F)" value={vitalsForm.temperature} onChange={(e) => setVitalsForm((s) => ({ ...s, temperature: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" inputMode="numeric" placeholder="SpO2 (%)" value={vitalsForm.spO2} onChange={(e) => setVitalsForm((s) => ({ ...s, spO2: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" inputMode="decimal" placeholder="Weight (kg)" value={vitalsForm.weight} onChange={(e) => setVitalsForm((s) => ({ ...s, weight: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" inputMode="decimal" placeholder="Height (cm)" value={vitalsForm.height} onChange={(e) => setVitalsForm((s) => ({ ...s, height: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        <input type="text" inputMode="decimal" placeholder="Blood Sugar (optional)" value={vitalsForm.bloodSugar} onChange={(e) => setVitalsForm((s) => ({ ...s, bloodSugar: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg md:col-span-2" />
                        <textarea placeholder="Notes (optional)" value={vitalsForm.notes} onChange={(e) => setVitalsForm((s) => ({ ...s, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg md:col-span-4 resize-none" />
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          type="button"
                          onClick={submitVitals}
                          disabled={addVitalsMutation.isPending}
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {addVitalsMutation.isPending ? <FaSpinner className="animate-spin" /> : null}
                          Save Vitals
                        </button>
                      </div>
                    </div>
                  )}
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
                                {vital.temperature ? `${vital.temperature} F` : '-'}
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
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="text"
                inputMode="numeric"
                {...register('dateOfBirth')}
                placeholder="dd/mm/yyyy"
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

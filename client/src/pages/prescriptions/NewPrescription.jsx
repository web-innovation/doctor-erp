import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaUserInjured,
  FaHeartbeat,
  FaStethoscope,
  FaPills,
  FaFlask,
  FaSave,
  FaPrint,
  FaPlus,
  FaTrash,
  FaSearch,
  FaArrowLeft,
} from 'react-icons/fa';
import { patientService } from '../../services/patientService';
import { appointmentService } from '../../services/appointmentService';
import billingService from '../../services/billingService';
import settingsService from '../../services/settingsService';
import { prescriptionService } from '../../services/prescriptionService';
import { useHasPerm, useAuth } from '../../context/AuthContext';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const dosageOptions = [
  { value: '1-0-0', label: '1-0-0 (Morning)' },
  { value: '0-1-0', label: '0-1-0 (Afternoon)' },
  { value: '0-0-1', label: '0-0-1 (Night)' },
  { value: '1-1-0', label: '1-1-0 (Morning, Afternoon)' },
  { value: '1-0-1', label: '1-0-1 (Morning, Night)' },
  { value: '0-1-1', label: '0-1-1 (Afternoon, Night)' },
  { value: '1-1-1', label: '1-1-1 (Thrice a day)' },
  { value: '1-1-1-1', label: '1-1-1-1 (Four times)' },
  { value: 'sos', label: 'SOS (As needed)' },
  { value: 'stat', label: 'STAT (Immediately)' },
];

const durationOptions = [
  { value: '3', label: '3 Days' },
  { value: '5', label: '5 Days' },
  { value: '7', label: '7 Days' },
  { value: '10', label: '10 Days' },
  { value: '14', label: '14 Days' },
  { value: '15', label: '15 Days' },
  { value: '21', label: '21 Days' },
  { value: '30', label: '30 Days' },
  { value: '60', label: '60 Days' },
  { value: '90', label: '90 Days' },
];

const mealTimingOptions = [
  { value: 'before', label: 'Before Food' },
  { value: 'after', label: 'After Food' },
  { value: 'with', label: 'With Food' },
  { value: 'any', label: 'Any Time' },
];

export default function NewPrescription() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = useHasPerm('prescriptions:create', ['DOCTOR', 'ADMIN', 'SUPER_ADMIN']);
  if (!canCreate) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold">Access denied</h2>
            <p className="text-sm text-gray-500 mt-2">You do not have permission to create prescriptions.</p>
          </div>
        </div>
      </div>
    );
  }

  const roleTokens = `${user?.role || ''} ${user?.effectiveRole || ''} ${user?.clinicRole || ''}`
    .toUpperCase()
    .split(/[^A-Z0-9]+/i)
    .map((t) => t.trim())
    .filter(Boolean);
  const isAdminCreator = roleTokens.includes('SUPER_ADMIN') || roleTokens.includes('ADMIN');
  const isDoctorCreator = roleTokens.includes('DOCTOR');

  const queryClient = useQueryClient();
  const [medicineSearch, setMedicineSearch] = useState('');
  const [labTestSearch, setLabTestSearch] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [showLabTestDropdown, setShowLabTestDropdown] = useState(false);
  const lastPayloadRef = useRef(null);
  const [patientAppointmentsEnabled, setPatientAppointmentsEnabled] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      doctor: null,
      patient: null,
      vitals: {
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        heartRate: '',
        temperature: '',
        weight: '',
        height: '',
        oxygenSaturation: '',
      },
      diagnosis: '',
      notes: '',
      medicines: [],
      labTests: [],
    },
  });

  const {
    fields: medicineFields,
    append: appendMedicine,
    remove: removeMedicine,
  } = useFieldArray({
    control,
    name: 'medicines',
  });

  const {
    fields: labTestFields,
    append: appendLabTest,
    remove: removeLabTest,
  } = useFieldArray({
    control,
    name: 'labTests',
  });

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientService.getPatients({ limit: 100 }),
  });

  const patientOptions = (patientsData?.data || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.patientId || `P${String(p.id).padStart(5, '0')}`})`,
    patient: p,
  }));

  const { data: doctorsData } = useQuery({
    queryKey: ['prescription-doctors-list'],
    queryFn: () => appointmentService.getDoctors(),
    enabled: isAdminCreator,
  });

  const doctorOptions = (doctorsData?.data || []).map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const selectedDoctorOption = watch('doctor');
  const selectedDoctorId = isAdminCreator
    ? selectedDoctorOption?.value
    : (isDoctorCreator ? user?.id : undefined);
  const selectedDoctorLabel = isAdminCreator
    ? selectedDoctorOption?.label
    : (user?.name || 'You');

  // Fetch scheduled appointments for selected patient (doctor will only see own scheduled appointments)
  const patientIdSelected = () => watch('patient')?.value;
  const { data: patientAppointmentsData } = useQuery({
    queryKey: ['patient-appointments', patientIdSelected(), selectedDoctorId],
    queryFn: () =>
      appointmentService.getAppointments({
        patientId: patientIdSelected(),
        status: 'SCHEDULED',
        doctorId: selectedDoctorId,
        limit: 50
      }),
    enabled: !!patientIdSelected() && (!!selectedDoctorId || !isAdminCreator),
  });

  const appointmentOptions = (patientAppointmentsData?.data || []).map(a => ({ value: a.id, label: `${a.appointmentNo || ''} ${a.date ? `- ${new Date(a.date).toLocaleDateString('en-GB')}` : ''}`, appt: a }));

  // Search medicines
  const { data: medicinesData } = useQuery({
    queryKey: ['medicines-search', medicineSearch],
    queryFn: () => prescriptionService.searchMedicines(medicineSearch, 10),
    enabled: medicineSearch.length >= 2,
  });

  const medicineResults = medicinesData?.data || [];

  // Search lab tests
  const { data: labTestsData } = useQuery({
    queryKey: ['lab-tests-search', labTestSearch],
    queryFn: () => prescriptionService.searchLabTests(labTestSearch),
    enabled: labTestSearch.length >= 2,
  });

  const labTestResults = labTestsData?.data || [];

  const { data: consultationData } = useQuery({
    queryKey: ['consultation-fees'],
    queryFn: () => settingsService.getConsultationFees(),
  });
  const consultationFees = consultationData?.data?.fees || {};

  const { data: taxSettings } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => settingsService.getTaxSettings(),
  });

  // Create prescription mutation
  const createMutation = useMutation({
    mutationFn: prescriptionService.createPrescription,
    onSuccess: async (response) => {
      toast.success('Prescription saved successfully');
      const prescriptionData = response.data || response;
      // Create a draft bill for this prescription so clinic staff can publish/modify
      try {
        const payloadSnapshot = lastPayloadRef.current || {};
        const billItems = [];

        // Always add a consultation item by default (doctor raised prescription)
        let consultationFee = 0;
        let consultationLabel = 'Consultation';
        if (payloadSnapshot.appointmentId && Array.isArray(patientAppointmentsData?.data)) {
          const appt = (patientAppointmentsData.data || []).find(x => x.id === payloadSnapshot.appointmentId);
          if (appt) {
            consultationFee = appt.consultationFee || 0;
            consultationLabel = `Consultation (${appt.appointmentNo || ''})`;
          }
        }
        if (!consultationFee) {
          const consultationDoctorId = payloadSnapshot.doctorId || user?.id;
          consultationFee = Number(consultationFees?.[consultationDoctorId] || 0);
        }
        billItems.push({ description: consultationLabel, quantity: 1, unitPrice: consultationFee, type: 'consultation' });

        // Medicines
        (payloadSnapshot.medicines || []).forEach((m) => {
          billItems.push({
            description: m.medicineName || m.name || m.medicine || '',
            quantity: m.quantity || 1,
            unitPrice: m.price || m.unitPrice || 0,
            type: 'pharmacy',
            productId: m.productId || null
          });
        });

        // Lab tests
        (payloadSnapshot.labTests || []).forEach((lt) => {
          billItems.push({
            description: lt.testName || lt.name || '',
            quantity: 1,
            unitPrice: lt.price || 0,
            type: 'lab_test',
            labId: lt.labId || null,
            labTestId: lt.testId || null
          });
        });

        if (billItems.length > 0) {
          const billReq = {
            patientId: prescriptionData.patientId || payloadSnapshot.patientId,
            type: 'MIXED',
            items: billItems,
            notes: `Draft bill for prescription ${prescriptionData.prescriptionNo || ''}`,
            doctorId: payloadSnapshot.doctorId || user?.id,
            defaultConsultationGstPercent: Number(taxSettings?.consultationGST || 0),
            defaultPharmacyGstPercent: Number(taxSettings?.pharmacyGST || 0),
            defaultLabTestGstPercent: Number(taxSettings?.labGST || 0),
            defaultConsultationDiscountPercent: 0,
            defaultPharmacyDiscountPercent: 0,
            defaultLabTestDiscountPercent: 0,
          };
          try {
            await billingService.createBill(billReq);
            try { queryClient.invalidateQueries({ queryKey: ['bills'] }); } catch (e) {}
          } catch (e) {
            console.error('Failed creating draft bill:', e);
          }
        }
      } catch (e) {
        console.error('Failed to create draft bill for prescription:', e);
      }
      // Try to open print dialog (PDF generation may not be available)
      try {
        const pdfBlob = await prescriptionService.getPrescriptionPdf(prescriptionData.id);
        const url = window.URL.createObjectURL(pdfBlob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } catch (error) {
        console.log('PDF not available, navigating to prescriptions');
      }
      // Update local prescriptions list cache (all matching prescriptions queries)
      try {
        queryClient.setQueriesData({ queryKey: ['prescriptions'] }, (old) => {
          if (!old) return old;
          // If the cached value is an object with a `data` array and pagination
          if (old && typeof old === 'object' && Array.isArray(old.data)) {
            return { ...old, data: [prescriptionData, ...old.data] };
          }
          // If the cached value is a plain array of prescriptions
          if (Array.isArray(old)) {
            return [prescriptionData, ...old];
          }
          return old;
        });
      } catch (e) {
        console.error('Failed to update prescriptions cache optimistically', e);
      }
      navigate('/prescriptions');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save prescription');
      console.error('Failed to create prescription:', error);
    },
  });

  const onSubmit = (data) => {
    if (isAdminCreator && !data.doctor?.value) {
      toast.error('Please select doctor');
      return;
    }

    const payload = {
      appointmentId: data.appointment?.value,
      doctorId: isAdminCreator ? data.doctor?.value : undefined,
      patientId: data.patient?.value,
      vitalsSnapshot: {
        bloodPressureSystolic: data.vitals.bloodPressureSystolic
          ? parseInt(data.vitals.bloodPressureSystolic)
          : null,
        bloodPressureDiastolic: data.vitals.bloodPressureDiastolic
          ? parseInt(data.vitals.bloodPressureDiastolic)
          : null,
        heartRate: data.vitals.heartRate ? parseInt(data.vitals.heartRate) : null,
        temperature: data.vitals.temperature ? parseFloat(data.vitals.temperature) : null,
        weight: data.vitals.weight ? parseFloat(data.vitals.weight) : null,
        height: data.vitals.height ? parseFloat(data.vitals.height) : null,
        oxygenSaturation: data.vitals.oxygenSaturation
          ? parseInt(data.vitals.oxygenSaturation)
          : null,
      },
      diagnosis: data.diagnosis,
      clinicalNotes: data.notes,
      medicines: data.medicines.map((m) => ({
        productId: m.medicineId,
        medicineName: m.name,
        price: m.price ? parseFloat(m.price) : 0,
        dosage: m.dosage?.value || m.dosage,
        duration: m.duration?.value || m.duration,
        timing: m.mealTiming?.value || m.mealTiming,
        frequency: m.dosage?.value || m.dosage,
        instructions: m.instructions,
        quantity: m.quantity ? parseInt(m.quantity) : 1,
        isExternal: !!m.isExternal,
      })),
      labTests: data.labTests.map((lt) => ({
        testId: lt.testId || null,
        testName: lt.name,
        price: lt.price ? parseFloat(lt.price) : 0,
        instructions: lt.instructions,
        isExternal: !!lt.isExternal,
        labId: lt.labId || null,
      })),
    };

    // keep a snapshot for post-create actions (draft billing)
    lastPayloadRef.current = payload;
    createMutation.mutate(payload);
  };

  const handleAddMedicine = (medicine) => {
    appendMedicine({
      medicineId: medicine.id,
      name: medicine.name,
      price: medicine.price || medicine.sellingPrice || medicine.mrp || 0,
      dosage: null,
      duration: null,
      mealTiming: null,
      instructions: '',
      quantity: '',
      isExternal: false,
    });
    setMedicineSearch('');
    setShowMedicineDropdown(false);
  };

  const handleAddExternalMedicine = (name) => {
    appendMedicine({
      medicineId: null,
      name: name,
      price: 0,
      dosage: null,
      duration: null,
      mealTiming: null,
      instructions: '',
      quantity: 1,
      isExternal: true,
    });
    setMedicineSearch('');
    setShowMedicineDropdown(false);
  };

  const handleAddLabTest = (test) => {
    appendLabTest({
      testId: test.id || null,
      labId: test.labId || null,
      name: test.name,
      price: test.price || null,
      labName: test.labName || null,
      instructions: '',
      isExternal: !!test.isCatalog ? false : false,
    });
    setLabTestSearch('');
    setShowLabTestDropdown(false);
  };

  const handleAddExternalLabTest = (name) => {
    appendLabTest({ testId: null, labId: null, name, price: null, labName: null, instructions: '', isExternal: true });
    setLabTestSearch('');
    setShowLabTestDropdown(false);
  };

  const selectedPatient = watch('patient')?.patient;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Prescription</h1>
            <p className="text-gray-500 mt-1">Create a new prescription for a patient</p>
            <p className="text-sm text-gray-600 mt-2">
              Doctor: <strong className="text-gray-900">{selectedDoctorLabel || 'Select doctor'}</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FaUserInjured className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Patient Information</h2>
            </div>

            {isAdminCreator && (
              <div className="mb-4">
                <Select
                  label="Select Doctor"
                  name="doctor"
                  control={control}
                  options={doctorOptions}
                  placeholder="Search and select doctor..."
                  rules={{ required: 'Doctor is required' }}
                  error={errors.doctor?.message}
                  isSearchable
                />
              </div>
            )}

            <Select
              label="Select Patient"
              name="patient"
              control={control}
              options={patientOptions}
              placeholder="Search and select patient..."
              rules={{ required: 'Patient is required' }}
              error={errors.patient?.message}
              isSearchable
            />

            {selectedPatient && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Age:</span>
                    <span className="ml-2 font-medium">
                      {selectedPatient.age ? `${selectedPatient.age} yrs` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <span className="ml-2 font-medium capitalize">
                      {selectedPatient.gender || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{selectedPatient.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Blood Group:</span>
                    <span className="ml-2 font-medium">{selectedPatient.bloodGroup || '-'}</span>
                  </div>
                </div>
                {selectedPatient.allergies && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-red-700 text-sm font-medium">Allergies: </span>
                    <span className="text-red-600 text-sm">{selectedPatient.allergies}</span>
                  </div>
                )}
              </div>
            )}

            {/* Appointment selection (optional) - show scheduled appointments for the selected patient */}
            {appointmentOptions.length > 0 && (
              <div className="mt-4">
                <Controller
                  name="appointment"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="Select Appointment (optional)"
                      options={appointmentOptions}
                      placeholder="Select appointment..."
                      isClearable
                      isSearchable
                      onChange={(val) => { field.onChange(val); setSelectedAppointment(val); }}
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* Vitals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FaHeartbeat className="text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Vitals</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Blood Pressure
                </label>
                <div className="flex items-center gap-2">
                  <input
                    {...register('vitals.bloodPressureSystolic')}
                    type="number"
                    placeholder="Sys"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">/</span>
                  <input
                    {...register('vitals.bloodPressureDiastolic')}
                    type="number"
                    placeholder="Dia"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">mmHg</span>
                </div>
              </div>

              <Input
                label="Heart Rate"
                type="number"
                placeholder="72"
                {...register('vitals.heartRate')}
                helperText="bpm"
              />

              <Input
                label="Temperature"
                type="number"
                step="0.1"
                placeholder="98.6"
                {...register('vitals.temperature')}
                helperText="°F"
              />

              <Input
                label="SpO2"
                type="number"
                placeholder="98"
                {...register('vitals.oxygenSaturation')}
                helperText="%"
              />

              <Input
                label="Weight"
                type="number"
                step="0.1"
                placeholder="70"
                {...register('vitals.weight')}
                helperText="kg"
              />

              <Input
                label="Height"
                type="number"
                placeholder="170"
                {...register('vitals.height')}
                helperText="cm"
              />
            </div>
          </div>

          {/* Diagnosis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FaStethoscope className="text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Diagnosis</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Diagnosis <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('diagnosis', { required: 'Diagnosis is required' })}
                  rows={2}
                  placeholder="Enter diagnosis..."
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                    errors.diagnosis
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.diagnosis && (
                  <p className="mt-1 text-sm text-red-600">{errors.diagnosis.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="Any additional notes or advice..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FaPills className="text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Medicines</h2>
              </div>
            </div>

            {/* Medicine Search */}
            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={medicineSearch}
                onChange={(e) => {
                  setMedicineSearch(e.target.value);
                  setShowMedicineDropdown(true);
                }}
                onFocus={() => setShowMedicineDropdown(true)}
                placeholder="Search medicines from pharmacy..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Medicine Dropdown */}
              {showMedicineDropdown && medicineSearch.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {medicineResults.length === 0 ? (
                    <div>
                      <div className="px-4 py-3 text-sm text-gray-500">No medicines found</div>
                      <div className="px-4 py-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => handleAddExternalMedicine(medicineSearch)}
                          className="w-full text-left px-3 py-2 bg-yellow-50 text-yellow-900 rounded-md"
                        >
                          Add "{medicineSearch}" as external medicine
                        </button>
                      </div>
                    </div>
                  ) : (
                    medicineResults.map((medicine) => (
                      <button
                        key={medicine.id}
                        type="button"
                        onClick={() => handleAddMedicine(medicine)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="font-medium text-gray-900">{medicine.name}</p>
                        <p className="text-sm text-gray-500">
                          {medicine.category && `${medicine.category} • `}
                          Stock: {medicine.stock || 0} • ₹{medicine.price}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Added Medicines List */}
            {medicineFields.length > 0 ? (
              <div className="space-y-4">
                {medicineFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{field.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <label className="inline-flex items-center text-sm">
                        <input
                          type="checkbox"
                          {...register(`medicines.${index}.isExternal`)}
                          className="form-checkbox h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-gray-700">Patient will buy externally</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Controller
                        name={`medicines.${index}.dosage`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            label="Dosage"
                            options={dosageOptions}
                            placeholder="Select..."
                            menuPlacement="auto"
                          />
                        )}
                      />

                      <Controller
                        name={`medicines.${index}.duration`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            label="Duration"
                            options={durationOptions}
                            placeholder="Select..."
                            menuPlacement="auto"
                          />
                        )}
                      />

                      <Controller
                        name={`medicines.${index}.mealTiming`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            label="Timing"
                            options={mealTimingOptions}
                            placeholder="Select..."
                            menuPlacement="auto"
                          />
                        )}
                      />

                      <Input
                        label="Quantity"
                        type="number"
                        placeholder="10"
                        {...register(`medicines.${index}.quantity`)}
                      />

                      <Input
                        label="Instructions"
                        placeholder="Special instructions..."
                        {...register(`medicines.${index}.instructions`)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaPills className="text-3xl text-gray-300 mx-auto mb-2" />
                <p>No medicines added. Search above to add medicines.</p>
              </div>
            )}
          </div>

          {/* Lab Tests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FaFlask className="text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Lab Tests</h2>
              </div>
            </div>

            {/* Lab Test Search */}
            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={labTestSearch}
                onChange={(e) => {
                  setLabTestSearch(e.target.value);
                  setShowLabTestDropdown(true);
                }}
                onFocus={() => setShowLabTestDropdown(true)}
                placeholder="Search lab tests..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Lab Test Dropdown */}
              {showLabTestDropdown && labTestSearch.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {labTestResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No lab tests found</div>
                  ) : (
                    labTestResults.map((test) => (
                      <button
                        key={test.id || test.name}
                        type="button"
                        onClick={() => handleAddLabTest(test)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{test.name}</p>
                            {test.category && (
                              <p className="text-sm text-gray-500">{test.category}</p>
                            )}
                            {test.labName && (
                              <p className="text-xs text-gray-400">From: {test.labName}</p>
                            )}
                          </div>
                          {test.price != null && (
                            <div className="text-sm font-medium text-gray-800">{test.price} {test.currency || 'INR'}</div>
                          )}
                        </div>
                      </button>
                    ))
                  )}

                  {/* Allow quick add as external test */}
                  {labTestResults.length === 0 && labTestSearch.length >= 2 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleAddExternalLabTest(labTestSearch)}
                        className="w-full text-left px-3 py-2 bg-yellow-50 text-yellow-900 rounded-md"
                      >
                        Add "{labTestSearch}" as external lab test
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Added Lab Tests List */}
            {labTestFields.length > 0 ? (
              <div className="space-y-3">
                {labTestFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{field.name}</p>
                    </div>
                    <input
                      {...register(`labTests.${index}.instructions`)}
                      placeholder="Special instructions..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <label className="inline-flex items-center ml-3">
                      <input
                        type="checkbox"
                        {...register(`labTests.${index}.isExternal`)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">Patient will buy externally</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeLabTest(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaFlask className="text-3xl text-gray-300 mx-auto mb-2" />
                <p>No lab tests added. Search above to add tests.</p>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              iconLeft={FaSave}
              iconRight={FaPrint}
              loading={createMutation.isPending}
            >
              Save & Print
            </Button>
          </div>

          {createMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                Failed to create prescription. Please try again.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaUser,
  FaClinicMedical,
  FaPercent,
  FaClock,
  FaCog,
  FaRupeeSign,
  FaSave,
  FaEye,
  FaEyeSlash,
  FaCheck,
  FaEnvelope,
  FaWhatsapp,
  FaPrint,
} from 'react-icons/fa';
import settingsService from '../../services/settingsService';
import { useAuth } from '../../context/AuthContext';
import EmailSettings from '../../components/settings/EmailSettings';
import WhatsAppSettings from '../../components/settings/WhatsAppSettings';
import RolePermissions from '../../components/settings/RolePermissions';
import MobileAccess from '../../components/settings/MobileAccess';
import {
  BILL_TEMPLATE_OPTIONS,
  PRESCRIPTION_TEMPLATE_OPTIONS,
  PRINT_TEMPLATE_PLACEHOLDERS,
  normalizePrintTemplateConfig,
} from '../../utils/printTemplates';

const TABS = [
  { id: 'profile', label: 'Profile', icon: FaUser },
  { id: 'clinic', label: 'Clinic', icon: FaClinicMedical },
  { id: 'consultation', label: 'Consultation Fees', icon: FaRupeeSign },
  { id: 'tax', label: 'Tax Setup', icon: FaPercent },
  { id: 'print', label: 'Print Templates', icon: FaPrint },
  // Working Hours temporarily hidden (managed elsewhere)
  // { id: 'hours', label: 'Working Hours', icon: FaClock },
  { id: 'email', label: 'Email', icon: FaEnvelope },
  { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp },
  { id: 'preferences', label: 'Preferences', icon: FaCog },
  { id: 'access', label: 'Access Management', icon: FaUser },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_WIDGETS = [
  { id: 'todayAppointments', label: 'Today\'s Appointments', enabled: true },
  { id: 'revenue', label: 'Revenue Stats', enabled: true },
  { id: 'recentPatients', label: 'Recent Patients', enabled: true },
  { id: 'lowStock', label: 'Low Stock Alerts', enabled: true },
  { id: 'pendingBills', label: 'Pending Bills', enabled: true },
  { id: 'upcomingFollowups', label: 'Upcoming Follow-ups', enabled: false },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { user, loadUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm();

  const newPasswordValue = watch('newPassword');

  // Clinic form
  const {
    register: registerClinic,
    handleSubmit: handleClinicSubmit,
    setValue: setClinicValue,
    formState: { errors: clinicErrors },
  } = useForm();

  // Tax form
  const {
    register: registerTax,
    handleSubmit: handleTaxSubmit,
    setValue: setTaxValue,
  } = useForm();

  // Working hours state
  const [workingHours, setWorkingHours] = useState(
    DAYS.map((day) => ({
      day,
      isOpen: day !== 'Sunday',
      openTime: '09:00',
      closeTime: '18:00',
      breakStart: '13:00',
      breakEnd: '14:00',
    }))
  );

  // Dashboard widgets state
  const [dashboardWidgets, setDashboardWidgets] = useState(DEFAULT_WIDGETS);
  const [consultationFees, setConsultationFees] = useState({});
  const [printTemplates, setPrintTemplates] = useState(
    normalizePrintTemplateConfig({})
  );

  // Fetch clinic settings
  const { data: clinicData, isLoading: clinicLoading } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: () => settingsService.getClinicSettings(),
  });

  // Populate clinic form when data is loaded
  useEffect(() => {
    if (clinicData) {
      setClinicValue('clinicName', clinicData.clinicName || '');
      setClinicValue('address', clinicData.address || '');
      setClinicValue('phone', clinicData.phone || '');
      setClinicValue('email', clinicData.email || '');
      setClinicValue('website', clinicData.website || '');
      setClinicValue('registrationNo', clinicData.registrationNo || '');
      setClinicValue('gstNo', clinicData.gstNo || '');
    }
  }, [clinicData, setClinicValue]);

  // Fetch tax settings
  const { data: taxData, isLoading: taxLoading } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => settingsService.getTaxSettings(),
  });

  // Populate tax form when data is loaded
  useEffect(() => {
    if (taxData) {
      setTaxValue('consultationGST', taxData.consultationGST || '');
      setTaxValue('pharmacyGST', taxData.pharmacyGST || '');
      setTaxValue('labGST', taxData.labGST || '');
      setTaxValue('otherGST', taxData.otherGST || '');
      setTaxValue('inclusiveTax', taxData.inclusiveTax || false);
    }
  }, [taxData, setTaxValue]);

  // Fetch working hours
  // Working hours temporarily disabled in UI
  /*
  const { data: hoursData, isLoading: hoursLoading } = useQuery({
    queryKey: ['working-hours'],
    queryFn: () => settingsService.getWorkingHours(),
  });

  // Populate working hours when data is loaded
  useEffect(() => {
    if (hoursData?.hours) {
      setWorkingHours(hoursData.hours);
    }
  }, [hoursData]);
  */

  // Fetch preferences
  const { data: preferencesData, isLoading: preferencesLoading } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => settingsService.getPreferences(),
  });

  // Populate preferences when data is loaded
  useEffect(() => {
    if (preferencesData?.dashboardWidgets) {
      setDashboardWidgets(preferencesData.dashboardWidgets);
    }
  }, [preferencesData]);

  // Fetch consultation fees
  const { data: consultationData, isLoading: consultationLoading } = useQuery({
    queryKey: ['consultation-fees'],
    queryFn: () => settingsService.getConsultationFees(),
  });

  useEffect(() => {
    const fees = consultationData?.data?.fees || {};
    setConsultationFees(fees);
  }, [consultationData]);

  const { data: printTemplateData, isLoading: printTemplateLoading } = useQuery({
    queryKey: ['print-templates'],
    queryFn: () => settingsService.getPrintTemplates(),
  });

  useEffect(() => {
    if (!printTemplateData) return;
    setPrintTemplates(normalizePrintTemplateConfig(printTemplateData));
  }, [printTemplateData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => settingsService.updateProfile(data),
    onSuccess: async () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries(['user']);
      // Refresh user data in auth context
      await loadUser();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data) => settingsService.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPassword();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  // Update clinic mutation
  const updateClinicMutation = useMutation({
    mutationFn: (data) => settingsService.updateClinicSettings(data),
    onSuccess: () => {
      toast.success('Clinic settings updated successfully');
      queryClient.invalidateQueries(['clinic-settings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update clinic settings');
    },
  });

  // Update tax mutation
  const updateTaxMutation = useMutation({
    mutationFn: (data) => settingsService.updateTaxSettings(data),
    onSuccess: () => {
      toast.success('Tax settings updated successfully');
      queryClient.invalidateQueries(['tax-settings']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update tax settings');
    },
  });

  // Update working hours mutation
  const updateHoursMutation = useMutation({
    mutationFn: (data) => settingsService.updateWorkingHours(data),
    onSuccess: () => {
      toast.success('Working hours updated successfully');
      queryClient.invalidateQueries(['working-hours']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update working hours');
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (data) => settingsService.updatePreferences(data),
    onSuccess: () => {
      toast.success('Preferences updated successfully');
      queryClient.invalidateQueries(['preferences']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update preferences');
    },
  });

  const updateConsultationFeesMutation = useMutation({
    mutationFn: (fees) => settingsService.updateConsultationFees(fees),
    onSuccess: () => {
      toast.success('Consultation fees updated successfully');
      queryClient.invalidateQueries(['consultation-fees']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update consultation fees');
    },
  });

  const updatePrintTemplatesMutation = useMutation({
    mutationFn: (data) => settingsService.updatePrintTemplates(data),
    onSuccess: () => {
      toast.success('Print templates updated successfully');
      queryClient.invalidateQueries(['print-templates']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update print templates');
    },
  });

  const onProfileSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const onClinicSubmit = (data) => {
    updateClinicMutation.mutate(data);
  };

  const onTaxSubmit = (data) => {
    updateTaxMutation.mutate({
      ...data,
      consultationGST: parseFloat(data.consultationGST) || 0,
      pharmacyGST: parseFloat(data.pharmacyGST) || 0,
      labGST: parseFloat(data.labGST) || 0,
      otherGST: parseFloat(data.otherGST) || 0,
    });
  };

  const handleWorkingHoursChange = (index, field, value) => {
    setWorkingHours((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const saveWorkingHours = () => {
    updateHoursMutation.mutate({ hours: workingHours });
  };

  const toggleWidget = (widgetId) => {
    setDashboardWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
      )
    );
  };

  const savePreferences = () => {
    updatePreferencesMutation.mutate({ dashboardWidgets });
  };

  const handleConsultationFeeChange = (doctorId, value) => {
    setConsultationFees((prev) => ({
      ...prev,
      [doctorId]: value === '' ? '' : Math.max(0, Number(value)),
    }));
  };

  const saveConsultationFees = () => {
    const sanitized = {};
    Object.entries(consultationFees || {}).forEach(([doctorId, amount]) => {
      const n = Number(amount);
      if (Number.isFinite(n) && n >= 0) sanitized[doctorId] = n;
    });
    updateConsultationFeesMutation.mutate(sanitized);
  };

  const savePrintTemplates = () => {
    const payload = normalizePrintTemplateConfig(printTemplates);
    updatePrintTemplatesMutation.mutate(payload);
  };

  // Render Profile Tab
  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerProfile('name', { required: 'Name is required' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {profileErrors.name && (
                <p className="mt-1 text-sm text-red-500">{profileErrors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...registerProfile('email', { required: 'Email is required' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {profileErrors.email && (
                <p className="mt-1 text-sm text-red-500">{profileErrors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                {...registerProfile('phone')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave />
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  {...registerPassword('currentPassword', {
                    required: 'Current password is required',
                  })}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.currentPassword.message}</p>
              )}
            </div>
            <div></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  {...registerPassword('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                {...registerPassword('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === newPasswordValue || 'Passwords do not match',
                })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave />
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // If user is plain STAFF, show only change-password (no profile/clinic/access controls)
  const isPlainStaff = user?.role === 'STAFF';
  if (isPlainStaff) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Settings</h1>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      {...registerPassword('currentPassword', {
                        required: 'Current password is required',
                      })}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-500">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>
                <div></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      {...registerPassword('newPassword', {
                        required: 'New password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                      })}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-500">{passwordErrors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    {...registerPassword('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === newPasswordValue || 'Passwords do not match',
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <FaSave />
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render Clinic Tab
  const renderClinicTab = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinic Information</h3>
      {clinicLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <form onSubmit={handleClinicSubmit(onClinicSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...registerClinic('clinicName', { required: 'Clinic name is required' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter clinic name"
              />
              {clinicErrors.clinicName && (
                <p className="mt-1 text-sm text-red-500">{clinicErrors.clinicName.message}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                {...registerClinic('address')}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter full address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                {...registerClinic('phone')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...registerClinic('email')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                {...registerClinic('website')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                {...registerClinic('registrationNo')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter registration number"
              />
            </div>
            {/*
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
              <input
                type="text"
                {...registerClinic('gstNo')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter GST number"
              />
            </div>
            */}
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={updateClinicMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave />
              {updateClinicMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  const renderTaxTab = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Configuration</h3>
      {taxLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <form onSubmit={handleTaxSubmit(onTaxSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consultation GST (%)
              </label>
              <input
                type="number"
                step="0.01"
                {...registerTax('consultationGST')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pharmacy GST (%)
              </label>
              <input
                type="number"
                step="0.01"
                {...registerTax('pharmacyGST')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab GST (%)</label>
              <input
                type="number"
                step="0.01"
                {...registerTax('labGST')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other GST (%)</label>
              <input
                type="number"
                step="0.01"
                {...registerTax('otherGST')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...registerTax('inclusiveTax')}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Prices are inclusive of tax (Tax will be calculated from the total price)
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={updateTaxMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave />
              {updateTaxMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  // Working hours management disabled in UI for now
  /*
  const renderHoursTab = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h3>
      {hoursLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Day</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Open</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Opening Time
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Closing Time
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Break Start
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">
                    Break End
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workingHours.map((schedule, index) => (
                  <tr key={schedule.day}>
                    <td className="px-4 py-3 font-medium text-gray-900">{schedule.day}</td>
                    <td className="px-4 py-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.isOpen}
                          onChange={(e) =>
                            handleWorkingHoursChange(index, 'isOpen', e.target.checked)
                          }
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="time"
                        value={schedule.openTime}
                        onChange={(e) =>
                          handleWorkingHoursChange(index, 'openTime', e.target.value)
                        }
                        disabled={!schedule.isOpen}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="time"
                        value={schedule.closeTime}
                        onChange={(e) =>
                          handleWorkingHoursChange(index, 'closeTime', e.target.value)
                        }
                        disabled={!schedule.isOpen}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="time"
                        value={schedule.breakStart}
                        onChange={(e) =>
                          handleWorkingHoursChange(index, 'breakStart', e.target.value)
                        }
                        disabled={!schedule.isOpen}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="time"
                        value={schedule.breakEnd}
                        onChange={(e) =>
                          handleWorkingHoursChange(index, 'breakEnd', e.target.value)
                        }
                        disabled={!schedule.isOpen}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={saveWorkingHours}
              disabled={updateHoursMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave />
              {updateHoursMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
  */

  // Render Preferences Tab
  const renderPreferencesTab = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Customization</h3>
      <p className="text-sm text-gray-500 mb-6">
        Choose which widgets to display on your dashboard
      </p>
      {preferencesLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardWidgets.map((widget) => (
              <div
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`p-4 border rounded-lg cursor-pointer transition ${
                  widget.enabled
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${widget.enabled ? 'text-blue-700' : 'text-gray-700'}`}>
                    {widget.label}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      widget.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    {widget.enabled && <FaCheck className="text-white text-xs" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={savePreferences}
              disabled={updatePreferencesMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave />
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderConsultationTab = () => {
    const doctors = consultationData?.data?.doctors || [];
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Doctor Consultation Fees</h3>
        <p className="text-sm text-gray-500 mb-6">
          Set consultation amount per doctor. These values are used in new bills and auto-bill from prescription.
        </p>

        {consultationLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-gray-500">No doctors found in this clinic.</p>
        ) : (
          <div className="space-y-3">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center border border-gray-100 rounded-lg p-3">
                <div className="md:col-span-2">
                  <p className="font-medium text-gray-900">{doctor.name}</p>
                  {doctor.email && <p className="text-xs text-gray-500">{doctor.email}</p>}
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={consultationFees?.[doctor.id] ?? ''}
                    onChange={(e) => handleConsultationFeeChange(doctor.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-4">
              <button
                onClick={saveConsultationFees}
                disabled={updateConsultationFeesMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <FaSave />
                {updateConsultationFeesMutation.isPending ? 'Saving...' : 'Save Consultation Fees'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPrintTemplatesTab = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Print Templates</h3>
      <p className="text-sm text-gray-500 mb-6">
        Choose a design for Bill and Prescription print. You can also use custom HTML with placeholders.
      </p>

      {printTemplateLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-100 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bill Template</label>
              <select
                value={printTemplates.billTemplateId}
                onChange={(e) => setPrintTemplates((prev) => ({ ...prev, billTemplateId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BILL_TEMPLATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="border border-gray-100 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Prescription Template</label>
              <select
                value={printTemplates.prescriptionTemplateId}
                onChange={(e) => setPrintTemplates((prev) => ({ ...prev, prescriptionTemplateId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRESCRIPTION_TEMPLATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {printTemplates.billTemplateId === 'custom' && (
            <div className="border border-gray-100 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Bill HTML</label>
              <textarea
                rows={10}
                value={printTemplates.customBillHtml}
                onChange={(e) => setPrintTemplates((prev) => ({ ...prev, customBillHtml: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="<h1>{{clinicName}}</h1><div>Bill {{billNo}}</div><table>{{itemsTableRows}}</table>"
              />
              <p className="text-xs text-gray-500 mt-2">
                Bill placeholders: {PRINT_TEMPLATE_PLACEHOLDERS.bill.join(', ')}
              </p>
            </div>
          )}

          {printTemplates.prescriptionTemplateId === 'custom' && (
            <div className="border border-gray-100 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Prescription HTML</label>
              <textarea
                rows={10}
                value={printTemplates.customPrescriptionHtml}
                onChange={(e) => setPrintTemplates((prev) => ({ ...prev, customPrescriptionHtml: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="<h1>{{clinicName}}</h1><div>Prescription {{prescriptionNo}}</div><table>{{medicinesTableRows}}</table>"
              />
              <p className="text-xs text-gray-500 mt-2">
                Prescription placeholders: {PRINT_TEMPLATE_PLACEHOLDERS.prescription.join(', ')}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={savePrintTemplates}
              disabled={updatePrintTemplatesMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <FaSave />
              {updatePrintTemplatesMutation.isPending ? 'Saving...' : 'Save Print Templates'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'clinic':
        return renderClinicTab();
      case 'consultation':
        return renderConsultationTab();
      case 'tax':
        return renderTaxTab();
      case 'print':
        return renderPrintTemplatesTab();
      case 'hours':
        return renderHoursTab();
      case 'email':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <EmailSettings />
          </div>
        );
      case 'whatsapp':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <WhatsAppSettings />
          </div>
        );
      case 'preferences':
        return renderPreferencesTab();
      case 'access':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <RolePermissions />
            </div>

            <div>
              <MobileAccess />
            </div>
          </div>
        );
      default:
        return renderProfileTab();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and clinic settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tabs Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <tab.icon className={activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}

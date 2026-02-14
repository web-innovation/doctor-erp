/**
 * Email Settings Component
 * Configure OAuth2 email notifications (Gmail, Outlook, SMTP)
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaEnvelope,
  FaGoogle,
  FaMicrosoft,
  FaServer,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaPaperPlane,
  FaSave,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaLock,
} from 'react-icons/fa';
import notificationService from '../../services/notificationService';

const PROVIDERS = [
  { id: 'gmail-app-password', name: 'Gmail (App Password)', icon: FaLock, color: 'text-green-500', recommended: true },
  { id: 'gmail', name: 'Gmail (OAuth2)', icon: FaGoogle, color: 'text-red-500' },
  { id: 'outlook', name: 'Outlook (OAuth2)', icon: FaMicrosoft, color: 'text-blue-500' },
  { id: 'smtp', name: 'SMTP (Custom)', icon: FaServer, color: 'text-gray-500' },
];

export default function EmailSettings() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState('gmail-app-password');
  const [showSecrets, setShowSecrets] = useState({});
  const [isTesting, setIsTesting] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      provider: 'gmail-app-password',
      userEmail: '',
      fromName: 'Docsy',
      appPassword: '',
      clientId: '',
      clientSecret: '',
      refreshToken: '',
      tenantId: '',
      host: '',
      port: 587,
      user: '',
      password: '',
      secure: false,
    }
  });

  const provider = watch('provider');

  // Fetch current email configuration
  const { data: emailConfig, isLoading } = useQuery({
    queryKey: ['emailConfig'],
    queryFn: () => notificationService.getEmailConfig(),
  });

  // Update form when config is loaded
  useEffect(() => {
    if (emailConfig?.configured) {
      setSelectedProvider(emailConfig.provider);
      setValue('provider', emailConfig.provider);
      setValue('userEmail', emailConfig.userEmail || '');
      setValue('fromName', emailConfig.fromName || 'Docsy');
    }
  }, [emailConfig, setValue]);

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: notificationService.saveEmailConfig,
    onSuccess: () => {
      toast.success('Email configuration saved successfully');
      queryClient.invalidateQueries(['emailConfig']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    },
  });

  // Test email mutation
  const testMutation = useMutation({
    mutationFn: notificationService.testEmailConfig,
    onSuccess: (data) => {
      toast.success(data.message || 'Test email sent successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    },
  });

  const onSubmit = (data) => {
    // Filter out irrelevant fields based on provider
    const config = {
      provider: selectedProvider,
      userEmail: data.userEmail,
      fromName: data.fromName,
    };

    if (selectedProvider === 'gmail-app-password') {
      config.appPassword = data.appPassword;
    } else if (selectedProvider === 'gmail') {
      config.clientId = data.clientId;
      config.clientSecret = data.clientSecret;
      config.refreshToken = data.refreshToken;
    } else if (selectedProvider === 'outlook') {
      config.clientId = data.clientId;
      config.clientSecret = data.clientSecret;
      config.refreshToken = data.refreshToken;
      config.tenantId = data.tenantId;
    } else if (selectedProvider === 'smtp') {
      config.host = data.host;
      config.port = parseInt(data.port);
      config.user = data.user;
      config.password = data.password;
      config.secure = data.secure;
    }

    saveMutation.mutate(config);
  };

  const handleTest = () => {
    setIsTesting(true);
    testMutation.mutate(undefined, {
      onSettled: () => setIsTesting(false),
    });
  };

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaEnvelope className="text-sky-500" />
            Email Notifications
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure OAuth2 email for appointment reminders, prescriptions, and bills
          </p>
        </div>
        {emailConfig?.configured && (
          <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <FaCheckCircle /> Configured
          </span>
        )}
      </div>

      {/* Provider Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSelectedProvider(p.id);
              setValue('provider', p.id);
            }}
            className={`p-4 rounded-lg border-2 transition-all relative ${
              selectedProvider === p.id
                ? 'border-sky-500 bg-sky-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {p.recommended && (
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Easy
              </span>
            )}
            <p.icon className={`text-2xl mx-auto ${p.color}`} />
            <p className="text-sm font-medium mt-2">{p.name}</p>
          </button>
        ))}
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Common Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              {...register('userEmail', { required: 'Email is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="your-email@gmail.com"
            />
            {errors.userEmail && (
              <p className="text-sm text-red-500 mt-1">{errors.userEmail.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              {...register('fromName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Docsy"
            />
          </div>
        </div>

        {/* Gmail App Password Fields (Easiest Option) */}
        {selectedProvider === 'gmail-app-password' && (
          <div className="space-y-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <FaInfoCircle />
              <span>Simple setup - just need Gmail App Password</span>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline flex items-center gap-1"
              >
                Get App Password <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>

            <div className="bg-green-100 p-3 rounded-lg text-sm text-green-800">
              <p className="font-medium mb-1">How to get App Password:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Enable 2-Factor Authentication on your Google Account</li>
                <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">myaccount.google.com/apppasswords</a></li>
                <li>Select "Mail" and your device, click Generate</li>
                <li>Copy the 16-character password (no spaces needed)</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets.appPassword ? 'text' : 'password'}
                  {...register('appPassword', { required: selectedProvider === 'gmail-app-password' && 'App Password is required' })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="xxxx xxxx xxxx xxxx"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('appPassword')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets.appPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">16-character password from Google App Passwords</p>
            </div>
          </div>
        )}

        {/* Gmail OAuth2 Fields */}
        {selectedProvider === 'gmail' && (
          <div className="space-y-4 p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <FaInfoCircle />
              <span>Requires Google Cloud Console OAuth2 credentials</span>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline flex items-center gap-1"
              >
                Get Credentials <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('clientId', { required: selectedProvider === 'gmail' && 'Client ID is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="xxxx.apps.googleusercontent.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets.clientSecret ? 'text' : 'password'}
                  {...register('clientSecret', { required: selectedProvider === 'gmail' && 'Client Secret is required' })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="GOCSPX-xxxx"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('clientSecret')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets.clientSecret ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Refresh Token <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets.refreshToken ? 'text' : 'password'}
                  {...register('refreshToken', { required: selectedProvider === 'gmail' && 'Refresh Token is required' })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="1//xxxx"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('refreshToken')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets.refreshToken ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outlook OAuth2 Fields */}
        {selectedProvider === 'outlook' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <FaInfoCircle />
              <span>Requires Azure AD App Registration</span>
              <a
                href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                Get Credentials <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('clientId', { required: selectedProvider === 'outlook' && 'Client ID is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('tenantId', { required: selectedProvider === 'outlook' && 'Tenant ID is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets.clientSecret ? 'text' : 'password'}
                  {...register('clientSecret', { required: selectedProvider === 'outlook' && 'Client Secret is required' })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="xxxx~xxxx"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('clientSecret')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets.clientSecret ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Refresh Token <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSecrets.refreshToken ? 'text' : 'password'}
                  {...register('refreshToken', { required: selectedProvider === 'outlook' && 'Refresh Token is required' })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="M.xxxx"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret('refreshToken')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets.refreshToken ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMTP Fields */}
        {selectedProvider === 'smtp' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FaInfoCircle />
              <span>Use any SMTP server (AWS SES, SendGrid, Mailgun, etc.)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('host', { required: selectedProvider === 'smtp' && 'Host is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  {...register('port')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('user', { required: selectedProvider === 'smtp' && 'Username is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="your-smtp-user"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.password ? 'text' : 'password'}
                    {...register('password', { required: selectedProvider === 'smtp' && 'Password is required' })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="your-smtp-password"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('password')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets.password ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('secure')}
                className="w-4 h-4 text-sky-500 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-gray-700">Use TLS/SSL (port 465)</span>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !emailConfig?.configured}
            className="flex items-center gap-2 px-4 py-2 text-sky-600 bg-sky-50 rounded-lg hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <>
                <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <FaPaperPlane /> Send Test Email
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FaSave /> Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

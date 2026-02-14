/**
 * WhatsApp Settings Component
 * Configure WhatsApp notification settings per clinic
 * Supports: WhatsApp Business API, Twilio, or Manual wa.me links
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaWhatsapp,
  FaPhone,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaPaperPlane,
  FaSave,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaBuilding,
} from 'react-icons/fa';
import { SiTwilio } from 'react-icons/si';
import notificationService from '../../services/notificationService';

const PROVIDERS = [
  { 
    id: 'manual', 
    name: 'Manual (wa.me links)', 
    icon: FaWhatsapp, 
    color: 'text-green-500', 
    description: 'Opens WhatsApp Web for staff to send manually',
    recommended: true 
  },
  { 
    id: 'twilio', 
    name: 'Twilio WhatsApp', 
    icon: SiTwilio, 
    color: 'text-red-500',
    description: 'Automated sending via Twilio API' 
  },
  { 
    id: 'whatsapp-business', 
    name: 'WhatsApp Business API', 
    icon: FaBuilding, 
    color: 'text-green-600',
    description: 'Official WhatsApp Business Cloud API' 
  },
];

export default function WhatsAppSettings() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState('manual');
  const [showSecrets, setShowSecrets] = useState({});
  const [isTesting, setIsTesting] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      provider: 'manual',
      clinicWhatsAppNumber: '',
      clinicWhatsAppName: '',
      // Twilio settings
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioWhatsAppNumber: '',
      // WhatsApp Business API settings
      wabAccessToken: '',
      wabPhoneNumberId: '',
      wabBusinessId: '',
    }
  });

  const provider = watch('provider');

  // Fetch current WhatsApp configuration
  const { data: whatsappConfig, isLoading } = useQuery({
    queryKey: ['whatsappConfig'],
    queryFn: () => notificationService.getWhatsAppConfig(),
  });

  // Update form when config is loaded
  useEffect(() => {
    if (whatsappConfig?.configured) {
      setSelectedProvider(whatsappConfig.provider);
      setValue('provider', whatsappConfig.provider);
      setValue('clinicWhatsAppNumber', whatsappConfig.clinicWhatsAppNumber || '');
      setValue('clinicWhatsAppName', whatsappConfig.clinicWhatsAppName || '');
    }
  }, [whatsappConfig, setValue]);

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: notificationService.saveWhatsAppConfig,
    onSuccess: () => {
      toast.success('WhatsApp configuration saved successfully');
      queryClient.invalidateQueries(['whatsappConfig']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    },
  });

  // Test WhatsApp mutation
  const testMutation = useMutation({
    mutationFn: notificationService.testWhatsAppConfig,
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
        toast.success('WhatsApp Web opened. Send the test message to verify.');
      } else {
        toast.success(data.message || 'Test message sent successfully');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send test message');
    },
  });

  const onSubmit = (data) => {
    const config = {
      provider: selectedProvider,
      clinicWhatsAppNumber: data.clinicWhatsAppNumber,
      clinicWhatsAppName: data.clinicWhatsAppName,
    };

    if (selectedProvider === 'twilio') {
      config.twilioAccountSid = data.twilioAccountSid;
      config.twilioAuthToken = data.twilioAuthToken;
      config.twilioWhatsAppNumber = data.twilioWhatsAppNumber;
    } else if (selectedProvider === 'whatsapp-business') {
      config.wabAccessToken = data.wabAccessToken;
      config.wabPhoneNumberId = data.wabPhoneNumberId;
      config.wabBusinessId = data.wabBusinessId;
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
          <h2 className="text-xl font-semibold text-gray-900">WhatsApp Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure WhatsApp messaging for your clinic
          </p>
        </div>
        <div className="flex items-center gap-2">
          {whatsappConfig?.configured ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
              <FaCheckCircle />
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm">
              <FaTimesCircle />
              Not Configured
            </span>
          )}
        </div>
      </div>

      {/* Multi-Clinic Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Multi-Clinic WhatsApp Setup</p>
            <p>Each clinic can have its own WhatsApp number. Messages will appear to patients as coming from your clinic's WhatsApp account.</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-blue-700">
              <li><strong>Manual:</strong> Staff sends from clinic's phone with pre-filled message</li>
              <li><strong>Twilio:</strong> Automated sending from your Twilio WhatsApp number</li>
              <li><strong>Business API:</strong> Official WhatsApp Business for verified business accounts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          WhatsApp Provider
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROVIDERS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProvider(p.id);
                  setValue('provider', p.id);
                }}
                className={`relative p-4 border-2 rounded-xl text-left transition-all ${
                  selectedProvider === p.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {p.recommended && (
                  <span className="absolute top-2 right-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`text-2xl ${p.color}`} />
                  <span className="font-medium text-gray-900">{p.name}</span>
                </div>
                <p className="text-xs text-gray-500">{p.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Clinic WhatsApp Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <FaWhatsapp className="text-green-500" />
            Clinic WhatsApp Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic WhatsApp Number *
              </label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  {...register('clinicWhatsAppNumber', { required: 'Phone number is required' })}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              {errors.clinicWhatsAppNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.clinicWhatsAppNumber.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This is the phone number patients will see as the sender
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name (as shown in WhatsApp)
              </label>
              <input
                type="text"
                {...register('clinicWhatsAppName')}
                placeholder="City Health Clinic"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your WhatsApp Business profile name
              </p>
            </div>
          </div>
        </div>

        {/* Twilio Settings */}
        {selectedProvider === 'twilio' && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <SiTwilio className="text-red-500" />
                Twilio Configuration
              </h3>
              <a
                href="https://console.twilio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-red-600 hover:underline flex items-center gap-1"
              >
                Get credentials <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account SID *
                </label>
                <input
                  type="text"
                  {...register('twilioAccountSid', { 
                    required: selectedProvider === 'twilio' ? 'Account SID is required' : false 
                  })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auth Token *
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.twilioAuthToken ? 'text' : 'password'}
                    {...register('twilioAuthToken', { 
                      required: selectedProvider === 'twilio' ? 'Auth Token is required' : false 
                    })}
                    placeholder="Your Auth Token"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('twilioAuthToken')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets.twilioAuthToken ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twilio WhatsApp Number *
                </label>
                <input
                  type="text"
                  {...register('twilioWhatsAppNumber', { 
                    required: selectedProvider === 'twilio' ? 'WhatsApp number is required' : false 
                  })}
                  placeholder="+14155238886"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Twilio sandbox number or your registered WhatsApp number
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Business API Settings */}
        {selectedProvider === 'whatsapp-business' && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <FaBuilding className="text-green-600" />
                WhatsApp Business API Configuration
              </h3>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline flex items-center gap-1"
              >
                Setup Guide <FaExternalLinkAlt className="text-xs" />
              </a>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> WhatsApp Business API requires a verified Facebook Business account and approved WhatsApp Business phone number.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token *
                </label>
                <div className="relative">
                  <input
                    type={showSecrets.wabAccessToken ? 'text' : 'password'}
                    {...register('wabAccessToken', { 
                      required: selectedProvider === 'whatsapp-business' ? 'Access Token is required' : false 
                    })}
                    placeholder="Your permanent access token"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('wabAccessToken')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets.wabAccessToken ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  {...register('wabPhoneNumberId', { 
                    required: selectedProvider === 'whatsapp-business' ? 'Phone Number ID is required' : false 
                  })}
                  placeholder="1234567890123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Business Account ID
                </label>
                <input
                  type="text"
                  {...register('wabBusinessId')}
                  placeholder="1234567890123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Manual Mode Info */}
        {selectedProvider === 'manual' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 flex items-center gap-2 mb-2">
              <FaWhatsapp className="text-green-500" />
              How Manual Mode Works
            </h3>
            <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
              <li>When you click "Send via WhatsApp", a new tab opens with WhatsApp Web</li>
              <li>The message is pre-filled with prescription/appointment details</li>
              <li>Staff clicks "Send" in WhatsApp Web to complete sending</li>
              <li>The message appears to come from your clinic's WhatsApp account (the one logged into WhatsApp Web)</li>
            </ol>
            <p className="text-sm text-green-700 mt-3">
              <strong>Tip:</strong> Keep WhatsApp Web logged in on the clinic's computer with the clinic's WhatsApp Business account.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !whatsappConfig?.configured}
            className="inline-flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <span className="animate-spin">○</span>
                Sending...
              </>
            ) : (
              <>
                <FaPaperPlane />
                Send Test Message
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <>
                <span className="animate-spin">○</span>
                Saving...
              </>
            ) : (
              <>
                <FaSave />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

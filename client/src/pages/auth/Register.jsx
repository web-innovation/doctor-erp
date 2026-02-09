import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FaHospital,
  FaSpinner,
  FaUser,
  FaBuilding,
  FaLock,
  FaCheck,
  FaArrowLeft,
  FaArrowRight,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa';
import { authService } from '../../services/authService';

const steps = [
  { id: 1, title: 'Personal Info', icon: FaUser },
  { id: 2, title: 'Clinic Info', icon: FaBuilding },
  { id: 3, title: 'Password', icon: FaLock },
];

export default function Register() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      clinicName: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      toast.success('Registration successful! Please login.');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });

  const validateStep = async (step) => {
    let fieldsToValidate = [];
    
    switch (step) {
      case 1:
        fieldsToValidate = ['name', 'email', 'phone'];
        break;
      case 2:
        fieldsToValidate = ['clinicName', 'address', 'city', 'state', 'pincode'];
        break;
      case 3:
        fieldsToValidate = ['password', 'confirmPassword'];
        break;
      default:
        return true;
    }
    
    return await trigger(fieldsToValidate);
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data) => {
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <FaHospital className="h-10 w-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">DocClinic</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-6">Create your account</h1>
          <p className="text-gray-500 mt-2">Start managing your clinic in minutes</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep > step.id
                        ? 'bg-green-500 border-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <FaCheck />
                    ) : (
                      <step.icon />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 mb-6 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    {...register('name', {
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                    })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                    placeholder="Dr. John Smith"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                    placeholder="doctor@clinic.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[6-9]\d{9}$/,
                        message: 'Enter a valid 10-digit phone number',
                      },
                    })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                    placeholder="9876543210"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Clinic Info */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    {...register('clinicName', {
                      required: 'Clinic name is required',
                    })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.clinicName ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                    placeholder="City Health Clinic"
                  />
                  {errors.clinicName && (
                    <p className="mt-1 text-sm text-red-500">{errors.clinicName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    {...register('address', {
                      required: 'Address is required',
                    })}
                    rows={2}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none`}
                    placeholder="123, Main Street, Near City Hospital"
                  />
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      {...register('city', {
                        required: 'City is required',
                      })}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                      placeholder="Mumbai"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      {...register('state', {
                        required: 'State is required',
                      })}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                      placeholder="Maharashtra"
                    />
                    {errors.state && (
                      <p className="mt-1 text-sm text-red-500">{errors.state.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    {...register('pincode', {
                      required: 'Pincode is required',
                      pattern: {
                        value: /^\d{6}$/,
                        message: 'Enter a valid 6-digit pincode',
                      },
                    })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.pincode ? 'border-red-500' : 'border-gray-300'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
                    placeholder="400001"
                  />
                  {errors.pincode && (
                    <p className="mt-1 text-sm text-red-500">{errors.pincode.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Password */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                          message: 'Password must contain uppercase, lowercase, and number',
                        },
                      })}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-12`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                  )}
                  <div className="mt-2 space-y-1">
                    <p className={`text-xs ${password?.length >= 8 ? 'text-green-500' : 'text-gray-400'}`}>
                      • At least 8 characters
                    </p>
                    <p className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`}>
                      • One uppercase letter
                    </p>
                    <p className={`text-xs ${/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-400'}`}>
                      • One lowercase letter
                    </p>
                    <p className={`text-xs ${/\d/.test(password) ? 'text-green-500' : 'text-gray-400'}`}>
                      • One number
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) => value === password || 'Passwords do not match',
                      })}
                      className={`w-full px-4 py-3 rounded-lg border ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-12`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    {...register('terms', {
                      required: 'You must accept the terms',
                    })}
                    className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                  </label>
                </div>
                {errors.terms && (
                  <p className="text-sm text-red-500">{errors.terms.message}</p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 transition"
                >
                  <FaArrowLeft />
                  Back
                </button>
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Next
                  <FaArrowRight />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registerMutation.isPending ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          © {new Date().getFullYear()} DocClinic. All rights reserved.
        </p>
      </div>
    </div>
  );
}

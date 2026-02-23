import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FaHospital, FaSpinner, FaArrowLeft, FaEnvelope, FaCheckCircle } from 'react-icons/fa';
import { authService } from '../../services/authService';
console.log("hi")
export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: authService.forgotPassword,
    onSuccess: () => {
      setEmailSent(true);
      toast.success('Reset link sent to your email');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    },
  });

  const onSubmit = (data) => {
    forgotPasswordMutation.mutate(data);
  };

  const handleResend = () => {
    const email = getValues('email');
    forgotPasswordMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2">
            <FaHospital className="h-10 w-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Docsy ERP</span>
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!emailSent ? (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaEnvelope className="text-2xl text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
                <p className="text-gray-500 mt-2">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2 transition`}
                    placeholder="doctor@clinic.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                {/* Error Display */}
                {forgotPasswordMutation.isError && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {forgotPasswordMutation.error?.response?.data?.message || 
                      'Failed to send reset link. Please try again.'}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotPasswordMutation.isPending}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {forgotPasswordMutation.isPending ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheckCircle className="text-3xl text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
              <p className="text-gray-500 mb-6">
                We've sent a password reset link to{' '}
                <span className="font-medium text-gray-700">{getValues('email')}</span>
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={handleResend}
                    disabled={forgotPasswordMutation.isPending}
                    className="font-semibold underline hover:no-underline disabled:opacity-50"
                  >
                    click here to resend
                  </button>
                </p>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700"
              >
                <FaArrowLeft className="mr-2" />
                Back to Login
              </Link>
            </div>
          )}

          {/* Back to Login (when form is visible) */}
          {!emailSent && (
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-gray-600 hover:text-blue-600 transition"
              >
                <FaArrowLeft className="mr-2" />
                Back to Login
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          © {new Date().getFullYear()} Docsy ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}


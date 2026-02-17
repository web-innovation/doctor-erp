import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaHospital, FaSpinner } from 'react-icons/fa';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      console.log('Login response:', data);
      login(data.user, data.token);
      toast.success('Login successful!');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    },
  });

  const onSubmit = (data) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2">
            <FaHospital className="h-10 w-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Docsy</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-6">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account to continue</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email/Phone Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email or Phone
              </label>
              <input
                type="text"
                id="email"
                {...register('email', {
                  required: 'Email or phone is required',
                  validate: (value) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    const phoneRegex = /^[6-9]\d{9}$/;
                    if (!emailRegex.test(value) && !phoneRegex.test(value)) {
                      return 'Enter a valid email or 10-digit phone number';
                    }
                    return true;
                  },
                })}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                } focus:outline-none focus:ring-2 transition`}
                placeholder="doctor@clinic.com or 9876543210"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  } focus:outline-none focus:ring-2 transition pr-12`}
                  placeholder="Enter your password"
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
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error Display */}
            {loginMutation.isError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {loginMutation.error?.response?.data?.message || 'Login failed. Please try again.'}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loginMutation.isPending ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Register Link */}
          <p className="text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700">
              Create account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm mt-8">
          <p>© {new Date().getFullYear()} Docsy. All rights reserved.</p>
          <p className="mt-1">
            <Link to="/privacy" className="text-gray-500 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

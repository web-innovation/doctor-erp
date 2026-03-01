import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FaHospital, FaSpinner, FaLock } from 'react-icons/fa';
import { authService } from '../../services/authService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const resetMutation = useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: () => {
      toast.success('Password reset successful');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  const onSubmit = (data) => {
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }
    resetMutation.mutate({ token, newPassword: data.newPassword });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <FaHospital className="h-10 w-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Docsy ERP</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaLock className="text-2xl text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
            <p className="text-gray-500 mt-2">Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.newPassword ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.newPassword && <p className="mt-1 text-sm text-red-500">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                {...register('confirmPassword', {
                  required: 'Confirm password is required',
                  validate: (v) => v === watch('newPassword') || 'Passwords do not match',
                })}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={resetMutation.isPending || !token}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
            >
              {resetMutation.isPending ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

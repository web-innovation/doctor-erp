import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Simple setter for when login is done externally (e.g., via mutation)
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isLoading: false, error: null });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(email, password);
          const { user, token } = response.data;
          localStorage.setItem('token', token);
          set({ user, token, isLoading: false });
          return response;
        } catch (error) {
          const message = error.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(data);
          const { user, token } = response.data;
          localStorage.setItem('token', token);
          set({ user, token, isLoading: false });
          return response;
        } catch (error) {
          const message = error.response?.data?.message || 'Registration failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('token');
          set({ user: null, token: null, isLoading: false, error: null });
        }
      },

      loadUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true, token });
        try {
          const response = await authService.getProfile();
          set({ user: response.data, isLoading: false });
        } catch (error) {
          localStorage.removeItem('token');
          set({ user: null, token: null, isLoading: false });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.updateProfile(data);
          set({ user: response.data, isLoading: false });
          return response;
        } catch (error) {
          const message = error.response?.data?.message || 'Profile update failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      updatePreferences: async (preferences) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.updateProfile({ preferences });
          set((state) => ({
            user: { ...state.user, preferences: response.data.preferences },
            isLoading: false,
          }));
          return response;
        } catch (error) {
          const message = error.response?.data?.message || 'Preferences update failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Custom hook for easier access
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    token: store.token,
    isLoading: store.isLoading,
    error: store.error,
    isAuthenticated: !!store.user,
    login: store.setAuth,
    setAuth: store.setAuth,
    loginWithCredentials: store.login,
    logout: store.logout,
    register: store.register,
    loadUser: store.loadUser,
    updateProfile: store.updateProfile,
    updatePreferences: store.updatePreferences,
    clearError: store.clearError,
  };
};

// AuthProvider component for initialization
import { useEffect } from 'react';

export const AuthProvider = ({ children }) => {
  const loadUser = useAuthStore((state) => state.loadUser);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return children;
};

export default useAuthStore;

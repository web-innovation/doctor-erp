import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '../services/settingsService';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      activeViewUser: null,
      isLoading: false,
      error: null,

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Simple setter for when login is done externally (e.g., via mutation)
      setAuth: (user, token) => {
        try { localStorage.setItem('token', token); } catch (e) { /* ignore */ }
        // Compute clinic-admin flag consistently so UI immediately reflects admin role
        const demoAdminEmails = ['doctor@demo.com', 'admin@docclinic.com'];
        const isClinicAdminFlag = !!(
          user?.isClinicAdmin || user?.clinicRole === 'ADMIN' || user?.isOwner || demoAdminEmails.includes(user?.email)
        );
        set({ user: { ...user, isClinicAdmin: isClinicAdminFlag }, token, isLoading: false, error: null });
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

        // If impersonation is active, let api use impersonation token to fetch profile
        const impersonationActive = localStorage.getItem('impersonationActive') === 'true';
        const impersonationToken = localStorage.getItem('impersonationToken');

        set({ isLoading: true, token });
        try {
          // If there's a stale `activeViewUserId` in localStorage but impersonation
          // is not active, remove it so API requests are not accidentally forwarded
          // as `viewUserId` for GETs (this caused initial dashboard to load as
          // a previously-viewed staff user until refresh).
          if (!impersonationActive) {
            try { localStorage.removeItem('activeViewUserId'); } catch (e) { /* ignore */ }
          }

          const response = await authService.getProfile();
          const userData = response.data || {};
          // Compute clinic-admin flag: prefer server-provided flag, fall back to known clinic-owner/demo emails
          const demoAdminEmails = ['doctor@demo.com', 'admin@docclinic.com'];
          const isClinicAdminFlag = !!(
            userData.isClinicAdmin ||
            userData.clinicRole === 'ADMIN' ||
            userData.isOwner ||
            demoAdminEmails.includes(userData.email)
          );

          set({ user: { ...userData, isClinicAdmin: isClinicAdminFlag }, isLoading: false });

          // If impersonation active, store that separately and mark admin flag if applicable
          if (impersonationActive && impersonationToken) {
            const viewed = { ...userData };
            const viewedIsClinicAdmin = !!(
              viewed.isClinicAdmin || viewed.clinicRole === 'ADMIN' || viewed.isOwner || demoAdminEmails.includes(viewed.email)
            );
            // Use the store setter to normalize role
            get().setActiveViewUser({ ...viewed, isClinicAdmin: viewedIsClinicAdmin });
          }
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

      // Helper to normalize role strings across the app
      normalizeRole: (role) => {
        if (!role) return 'STAFF';
        const r = role.toString().toLowerCase();
        if (r.includes('super')) return 'SUPER_ADMIN';
        if (r.includes('doctor')) return 'DOCTOR';
        if (r.includes('pharm')) return 'PHARMACIST';
        if (r.includes('recept') || r.includes('reception')) return 'RECEPTIONIST';
        if (r.includes('account')) return 'ACCOUNTANT';
        if (r.includes('nurse')) return 'NURSE';
        if (r.includes('lab')) return 'LAB_TECHNICIAN';
        return r.toUpperCase();
      },

      // Allow admin/doctor to view dashboard as another staff/user
      setActiveViewUser: (viewUser) => {
        if (!viewUser) {
          localStorage.removeItem('activeViewUserId');
          return set({ activeViewUser: null });
        }
        const role = get().normalizeRole(viewUser.role);
        // persist the id so api layer can forward viewUserId on requests
        try { localStorage.setItem('activeViewUserId', viewUser.id); } catch (e) { /* ignore */ }
        set({ activeViewUser: { ...viewUser, role, effectiveRole: viewUser.role } });
      },
      clearActiveViewUser: () => {
        try { localStorage.removeItem('activeViewUserId'); } catch (e) { /* ignore */ }
        return set({ activeViewUser: null });
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
    activeViewUser: store.activeViewUser,
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
    setActiveViewUser: store.setActiveViewUser,
    clearActiveViewUser: store.clearActiveViewUser,
    normalizeRole: store.normalizeRole,
  };
};

// Centralized permission check hook for components
export const useHasPerm = (permKey, fallbackRoles = []) => {
  const store = useAuthStore();
  const user = store.user;
  const activeViewUser = store.activeViewUser;
  const normalizeRole = store.normalizeRole;

  // Fetch clinic role permissions (cached via react-query)
  const { data: rolePermResp } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => settingsService.getRolePermissions(),
    staleTime: 5 * 60 * 1000,
  });
  const rolePermissions = rolePermResp?.data?.data || rolePermResp?.data || rolePermResp || null;

  const { data: accessResp } = useQuery({
    queryKey: ['accessControls'],
    queryFn: () => settingsService.getAccessControls(),
    staleTime: 5 * 60 * 1000,
  });
  const accessControls = accessResp?.data?.data || accessResp?.data || accessResp || null;

  const rawRole = (activeViewUser && activeViewUser.role)
    || (user && user.role)
    || 'STAFF';
  const effectiveRole = normalizeRole(rawRole);

  const normalizeDisabled = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.startsWith('leader')) return raw.replace(/^leader/, 'ledger');
    return raw;
  };
  const isPermissionDisabled = (() => {
    const list = Array.isArray(accessControls?.disabledPermissions) ? accessControls.disabledPermissions : [];
    const set = new Set(list.map(normalizeDisabled).filter(Boolean));
    const perm = String(permKey || '').toLowerCase();
    const resource = perm.split(':')[0];
    return set.has(perm) || set.has(resource) || set.has(`${resource}:*`) || set.has('*');
  })();

  // If super admin disabled this permission, block for clinic users (including clinic admins)
  if (isPermissionDisabled && (effectiveRole || '').toString().toUpperCase() !== 'SUPER_ADMIN') return false;

  // Clinic admin (primary clinic doctor) should be able to see most things when NOT viewing-as
  if (user?.isClinicAdmin && !(activeViewUser && activeViewUser.id && user && activeViewUser.id !== user.id)) return true;

  if (!rolePermissions) {
    return fallbackRoles.includes((effectiveRole || '').toString().toUpperCase());
  }

  const effRoleKey = (effectiveRole || '').toString().toUpperCase();
  let roleKeyForLookup = effRoleKey;
  if (rolePermissions) {
    if (!rolePermissions[roleKeyForLookup]) {
      // fallback: nurse/lab technician should inherit STAFF permissions unless explicitly overridden
      if (['NURSE', 'LAB_TECHNICIAN'].includes(roleKeyForLookup) && rolePermissions['STAFF']) {
        roleKeyForLookup = 'STAFF';
      }
    }
  }

  const perms = rolePermissions[roleKeyForLookup];
  if (!Array.isArray(perms) || perms.length === 0) return false;
  return perms.includes(permKey);
};

// AuthProvider component for initialization
import { useEffect, useState } from 'react';

export const AuthProvider = ({ children }) => {
  const loadUser = useAuthStore((state) => state.loadUser);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadUser();
      } finally {
        if (mounted) setInitialized(true);
      }
    })();
    return () => { mounted = false; };
  }, [loadUser]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return children;
};

export default useAuthStore;

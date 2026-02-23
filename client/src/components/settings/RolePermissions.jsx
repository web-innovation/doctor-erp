import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import settingsService from '../../services/settingsService';
import Button from '../../components/common/Button';

// Include PATIENT so clinic admins can grant access to mobile patients (e.g. prescriptions)
const AVAILABLE_ROLES = ['DOCTOR','RECEPTIONIST','PHARMACIST','ACCOUNTANT','STAFF','PATIENT'];

const DEFAULT_PERMISSIONS = [
  'dashboard:view',
  'patients:read','patients:create','patients:update',
  'appointments:read','appointments:create','appointments:update',
  'prescriptions:read','prescriptions:create',
  'staff:read','staff:create','staff:update',
  'pharmacy:read','pharmacy:create','billing:read','billing:create','billing:edit','reports:opd',
  // Purchases / Ledger permissions
  'purchases:read','purchases:create','ledger:read','ledger:create','ledger:update','ledger:delete'
];

// Add leave permissions to default set so Access Management can control Leave access
DEFAULT_PERMISSIONS.push('leaves:read', 'leaves:create', 'leaves:update');

// Grouped permissions for better UI
const LAB_PERMISSIONS = [
  'labs:read','labs:create','labs:update','labs:tests'
];

const AGENT_PERMISSIONS = [
  'agents:read','agents:create','agents:update','commissions:read','commissions:pay'
];

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ queryKey: ['rolePermissions'], queryFn: () => settingsService.getRolePermissions() });
  const [local, setLocal] = useState(null);

  useEffect(() => {
    if (data?.data) {
      setLocal(data.data);
    } else if (!isLoading && !isError) {
      // initialize default structure when no remote data
      const init = {};
      AVAILABLE_ROLES.forEach((r) => {
        init[r] = DEFAULT_PERMISSIONS.slice();
      });
      setLocal(init);
    }
  }, [data, isLoading, isError]);

  const updateMutation = useMutation({
    mutationFn: settingsService.updateRolePermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      toast.success('Role permissions updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update role permissions');
    },
  });

  // Permission dependency rules: enabling a permission may imply others (e.g. manage -> read)
  const DEPENDENCIES = {
    'labs:manage': ['labs:read'],
    'labs:create': ['labs:read'],
    'labs:update': ['labs:read'],
    'labs:tests': ['labs:read'],
    'agents:manage': ['agents:read'],
    'agents:create': ['agents:read'],
    'agents:update': ['agents:read'],
    'commissions:pay': ['commissions:read'],
    'ledger:create': ['ledger:read'],
    'ledger:update': ['ledger:read'],
    'ledger:delete': ['ledger:read'],
    // Leave create/update should imply read
    'leaves:create': ['leaves:read'],
    'leaves:update': ['leaves:read'],
  };

  // Build reverse map for dependents: if A implies B, then B -> [A]
  const DEPENDENT_MAP = Object.keys(DEPENDENCIES).reduce((acc, key) => {
    DEPENDENCIES[key].forEach((d) => {
      acc[d] = acc[d] || [];
      acc[d].push(key);
    });
    return acc;
  }, {});

  const togglePermission = (role, perm) => {
    setLocal((prev) => {
      const arr = new Set(prev[role] || []);

      if (arr.has(perm)) {
        // Removing permission: remove perm and any permissions that depend on it
        arr.delete(perm);
        const queue = [perm];
        while (queue.length) {
          const p = queue.shift();
          const dependents = DEPENDENT_MAP[p] || [];
          for (const dep of dependents) {
            if (arr.has(dep)) {
              arr.delete(dep);
              queue.push(dep);
            }
          }
        }
      } else {
        // Adding permission: add perm and its required deps
        arr.add(perm);
        const implied = DEPENDENCIES[perm] || [];
        for (const d of implied) arr.add(d);
      }

      return { ...prev, [role]: Array.from(arr) };
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Role-based Feature Access</h3>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Role-based Feature Access</h3>
        <p className="text-sm text-red-500 mb-4">Failed to load role permissions: {error?.message || 'Unknown error'}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              // show hint to user about backend
              // eslint-disable-next-line no-alert
              alert('If this persists, ensure the backend migration/role-permissions endpoint is applied and the server is running.');
            }}
          >
            Help
          </Button>
        </div>
      </div>
    );
  }

  if (!local) return null;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">Role-based Feature Access</h3>
      <p className="text-sm text-gray-500 mb-4">Grant or revoke feature access per role. Changes affect only this clinic.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_ROLES.map((role) => (
          <div key={role} className="p-4 border rounded">
            <div className="flex items-center justify-between mb-2">
              <strong>{role}</strong>
            </div>

            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 mb-2">General</div>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_PERMISSIONS.map((perm) => (
                  <label key={perm} className="inline-flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded">
                    <input type="checkbox" checked={(local[role] || []).includes(perm)} onChange={() => togglePermission(role, perm)} />
                    <span className="text-sm">{perm}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Labs</div>
              <div className="flex flex-wrap gap-2">
                {LAB_PERMISSIONS.map((perm) => (
                  <label key={perm} className="inline-flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded">
                    <input type="checkbox" checked={(local[role] || []).includes(perm)} onChange={() => togglePermission(role, perm)} />
                    <span className="text-sm">{perm}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Agents & Commissions</div>
              <div className="flex flex-wrap gap-2">
                {AGENT_PERMISSIONS.map((perm) => (
                  <label key={perm} className="inline-flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded">
                    <input type="checkbox" checked={(local[role] || []).includes(perm)} onChange={() => togglePermission(role, perm)} />
                    <span className="text-sm">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="primary"
          onClick={() => updateMutation.mutate(local)}
          loading={updateMutation.isLoading}
        >
          Save Role Permissions
        </Button>
      </div>
    </div>
  );
}

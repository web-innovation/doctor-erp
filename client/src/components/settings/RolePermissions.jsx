import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import settingsService from '../../services/settingsService';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';

const AVAILABLE_ROLES = ['DOCTOR','RECEPTIONIST','PHARMACIST','ACCOUNTANT','STAFF'];

const DEFAULT_PERMISSIONS = [
  'patients:read','patients:create','patients:update',
  'appointments:read','appointments:create','appointments:update',
  'prescriptions:read','prescriptions:create',
  'pharmacy:read','pharmacy:create','billing:create','reports:opd'
];

export default function RolePermissions() {
  const queryClient = useQueryClient();
  const { data } = useQuery(['rolePermissions'], settingsService.getRolePermissions);
  const [local, setLocal] = useState({});

  useEffect(() => {
    if (data?.data) setLocal(data.data);
    else {
      // initialize default structure
      const init = {};
      AVAILABLE_ROLES.forEach(r => { init[r] = DEFAULT_PERMISSIONS.slice(); });
      setLocal(init);
    }
  }, [data]);

  const updateMutation = useMutation(settingsService.updateRolePermissions, {
    onSuccess: () => queryClient.invalidateQueries(['rolePermissions'])
  });

  const togglePermission = (role, perm) => {
    setLocal(prev => {
      const arr = new Set(prev[role] || []);
      if (arr.has(perm)) arr.delete(perm); else arr.add(perm);
      return { ...prev, [role]: Array.from(arr) };
    });
  };

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
            <div className="flex flex-wrap gap-2">
              {(DEFAULT_PERMISSIONS).map((perm) => (
                <label key={perm} className="inline-flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded">
                  <input type="checkbox" checked={(local[role]||[]).includes(perm)} onChange={() => togglePermission(role, perm)} />
                  <span className="text-sm">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={() => updateMutation.mutate(local)} loading={updateMutation.isLoading}>
          Save Role Permissions
        </Button>
      </div>
    </div>
  );
}

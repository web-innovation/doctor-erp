import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import settingsService from '../../services/settingsService';
import Button from '../../components/common/Button';

const MOBILE_PERMISSIONS = [
  'appointments:read',
  'prescriptions:read',
  'billing:read',
  'pharmacy:read',
];

export default function MobileAccess() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => settingsService.getRolePermissions(),
  });

  const [patientPerms, setPatientPerms] = useState([]);

  useEffect(() => {
    if (data && data.data && data.data.PATIENT) {
      setPatientPerms(Array.isArray(data.data.PATIENT) ? data.data.PATIENT : []);
    } else if (!isLoading && !isError) {
      setPatientPerms([]);
    }
  }, [data, isLoading, isError]);

  const updateMutation = useMutation({
    mutationFn: (payload) => settingsService.updateRolePermissions(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      toast.success('Mobile access updated');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update mobile access');
    },
  });

  const toggle = (perm) => {
    setPatientPerms((prev) => {
      const s = new Set(prev || []);
      if (s.has(perm)) s.delete(perm);
      else s.add(perm);
      return Array.from(s);
    });
  };

  const save = () => {
    const current = (data && data.data) ? { ...data.data } : {};
    current.PATIENT = patientPerms;
    updateMutation.mutate(current);
  };

  if (isLoading) return <div className="p-4">Loading mobile access...</div>;
  if (isError) return (
    <div className="p-4">
      <div className="text-red-600">Failed to load mobile access settings.</div>
      <div className="mt-2">
        <Button variant="ghost" onClick={() => refetch()}>Retry</Button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h4 className="text-lg font-semibold mb-2">Mobile App</h4>
      <p className="text-sm text-gray-500 mb-4">Grant mobile (patient) access to select features.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {MOBILE_PERMISSIONS.map((perm) => (
          <label key={perm} className="inline-flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded">
            <input type="checkbox" checked={(patientPerms || []).includes(perm)} onChange={() => toggle(perm)} />
            <span className="text-sm">{perm}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} loading={updateMutation.isLoading}>Save Mobile Access</Button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { staffService } from '../../services/staffService';

export default function StaffAssignments() {
  const [staff, setStaff] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const s = await staffService.getAll({ limit: 200 });
      setStaff(s.data || s);
      // Fetch doctors via admin users endpoint (role=DOCTOR)
      const resp = await api.get('/admin/users', { params: { role: 'DOCTOR', limit: 200 } });
      setDoctors(resp.data?.data || resp.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAssign = async (staffId, doctorId) => {
    if (!doctorId) return alert('Select a doctor to assign');
    try {
      await staffService.assignToDoctor(staffId, doctorId);
      await loadAll();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to assign');
    }
  };

  const handleUnassign = async (staffId, doctorId) => {
    if (!doctorId) return alert('Select a doctor to unassign');
    try {
      await staffService.unassignFromDoctor(staffId, doctorId);
      await loadAll();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to unassign');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Staff Assignments</h2>
      <p className="text-sm text-gray-500 mb-4">Assign staff to doctors (exclusive) or leave unassigned for shared staff.</p>
      <div className="overflow-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">Staff</th>
              <th className="px-2 py-1">Designation</th>
              <th className="px-2 py-1">Current Assignments</th>
              <th className="px-2 py-1">Assign To</th>
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-2 py-2">{s.user?.name || s.employeeId}</td>
                <td className="px-2 py-2">{s.designation}</td>
                <td className="px-2 py-2">
                  {s.assignments && s.assignments.length > 0 ? (
                    s.assignments.map(a => a.doctor?.name || a.doctor?.email).join(', ')
                  ) : (
                    <span className="text-gray-500">Shared / Unassigned</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <select id={`doctor-select-${s.id}`} className="border rounded px-2 py-1">
                    <option value="">-- select doctor --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name || d.email}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => {
                      const el = document.getElementById(`doctor-select-${s.id}`);
                      handleAssign(s.id, el?.value);
                    }}
                    className="bg-blue-600 text-white px-3 py-1 rounded mr-2"
                  >Assign</button>
                  <button
                    onClick={() => {
                      const el = document.getElementById(`doctor-select-${s.id}`);
                      handleUnassign(s.id, el?.value);
                    }}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >Unassign</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

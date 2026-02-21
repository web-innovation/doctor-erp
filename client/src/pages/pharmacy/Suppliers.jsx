import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseService } from '../../services/purchaseService';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['suppliers'], queryFn: () => purchaseService.getSuppliers(''), keepPreviousData: true });
  const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '', notes: '' });

  const queryClient = useQueryClient();

  const createMut = useMutation({ mutationFn: (body) => purchaseService.createSupplier(body), onSuccess: async () => { toast.success('Supplier created'); setForm({ name: '', phone: '', email: '', address: '', gstNumber: '', notes: '' }); await refetch(); } });
  const updateMut = useMutation({ mutationFn: ({ id, body }) => purchaseService.updateSupplier(id, body), onSuccess: async () => { toast.success('Supplier updated'); setEditing(null); await refetch(); } });
  const deleteMut = useMutation({
    mutationFn: (id) => purchaseService.deleteSupplier(id),
    // Optimistic update: remove supplier from cache immediately
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['suppliers'] });
      const previous = queryClient.getQueryData(['suppliers']);
      queryClient.setQueryData(['suppliers'], (old) => {
        const arr = Array.isArray(old) ? old : (Array.isArray(old?.data) ? old.data : []);
        return arr.filter((s) => s.id !== id);
      });
      return { previous };
    },
    onError: (err, id, context) => {
      if (context?.previous) queryClient.setQueryData(['suppliers'], context.previous);
      toast.error('Failed to delete supplier');
    },
    onSettled: async () => {
      toast.success('Supplier deleted');
      await refetch();
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Suppliers</h1>
        </div>

        <div className="bg-white rounded p-4 mb-6">
          <h3 className="font-medium mb-2">Create Supplier</h3>
          <div className="grid grid-cols-2 gap-2">
            <input className="p-2 border rounded" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="p-2 border rounded" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className="p-2 border rounded" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <input className="p-2 border rounded" placeholder="GST Number" value={form.gstNumber} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))} />
            <input className="p-2 border rounded col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            <input className="p-2 border rounded col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={() => createMut.mutate(form)}>Create</button>
            <button className="px-3 py-2 border rounded" onClick={() => setForm({ name: '', phone: '', email: '', address: '', gstNumber: '', notes: '' })}>Reset</button>
          </div>
        </div>

        <div className="bg-white rounded p-4">
          <h3 className="font-medium mb-2">Supplier List</h3>
          {isLoading ? <div>Loading…</div> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr><th className="p-2 text-left">Name</th><th className="p-2">Phone</th><th className="p-2">GST</th><th className="p-2"> </th></tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">{s.phone || '-'}</td>
                    <td className="p-2">{s.gstNumber || '-'}</td>
                    <td className="p-2 text-right">
                      <button className="px-2 py-1 mr-2 text-sm border rounded" onClick={() => { setEditing(s); setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', gstNumber: s.gstNumber || '', notes: s.notes || '' }); }}>Edit</button>
                      <button className="px-2 py-1 text-sm bg-red-600 text-white rounded" onClick={() => { if (confirm('Delete supplier?')) deleteMut.mutate(s.id); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {editing && (
            <div className="mt-4 p-3 border rounded">
              <h4 className="font-medium">Edit Supplier</h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input className="p-2 border rounded" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <input className="p-2 border rounded" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                <input className="p-2 border rounded" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                <input className="p-2 border rounded" placeholder="GST Number" value={form.gstNumber} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))} />
                <input className="p-2 border rounded col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                <input className="p-2 border rounded col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="mt-3 flex gap-2 justify-end">
                <button className="px-3 py-1 border rounded" onClick={() => setEditing(null)}>Cancel</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => updateMut.mutate({ id: editing.id, body: form })}>Save</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

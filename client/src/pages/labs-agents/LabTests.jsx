import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Modal from '../../components/common/Modal';
import labsAgentsService from '../../services/labsAgentsService';
import { useParams, Link } from 'react-router-dom';

export default function LabTests() {
  const { labId } = useParams();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const { register, handleSubmit, reset } = useForm();
  const { register: regEdit, handleSubmit: handleEdit, setValue, reset: resetEdit } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['labTests', labId],
    queryFn: () => labsAgentsService.getLabTests(labId, { limit: 100 }),
    enabled: !!labId,
  });

  const createTest = useMutation({
    mutationFn: (payload) => labsAgentsService.createLabTest(labId, payload),
    onSuccess: () => { toast.success('Test created'); queryClient.invalidateQueries(['labTests', labId]); setIsAddOpen(false); reset(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
  });

  const updateTest = useMutation({
    mutationFn: ({ id, data }) => labsAgentsService.updateLabTest(labId, id, data),
    onSuccess: () => { toast.success('Test updated'); queryClient.invalidateQueries(['labTests', labId]); setIsEditOpen(false); setSelected(null); resetEdit(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  const deleteTest = useMutation({
    mutationFn: (id) => labsAgentsService.deleteLabTest(labId, id),
    onSuccess: () => { toast.success('Test deleted'); queryClient.invalidateQueries(['labTests', labId]); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  });

  const tests = data?.data || [];

  const onAdd = (vals) => {
    createTest.mutate({ name: vals.name, code: vals.code, category: vals.category, price: parseFloat(vals.price || 0), description: vals.description });
  };

  const onEdit = (vals) => {
    if (!selected) return;
    updateTest.mutate({ id: selected.id, data: { name: vals.name, code: vals.code, category: vals.category, price: parseFloat(vals.price || 0), description: vals.description } });
  };

  const openEdit = (t) => {
    setSelected(t);
    setValue('name', t.name);
    setValue('code', t.code);
    setValue('category', t.category);
    setValue('price', t.price);
    setValue('description', t.description);
    setIsEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Lab Tests</h1>
            <p className="text-sm text-gray-500">Manage tests for the selected lab</p>
            <p className="text-sm text-gray-400 mt-1">Lab: <Link to="/labs-agents" className="text-blue-600">Back to Labs</Link></p>
          </div>
          <button onClick={() => setIsAddOpen(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"> <FaPlus/> Add Test</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : tests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tests found. Add one to get started.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 text-sm text-gray-600">Price</th>
                  <th className="text-right px-4 py-3 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tests.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">{t.name}</td>
                    <td className="px-4 py-3">{t.code || '-'}</td>
                    <td className="px-4 py-3">{t.category || '-'}</td>
                    <td className="px-4 py-3">{t.price ? `₹${t.price}` : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(t)} className="p-2 text-blue-600 mr-2"><FaEdit/></button>
                      <button onClick={() => { if (confirm('Delete test?')) deleteTest.mutate(t.id); }} className="p-2 text-red-600"><FaTrash/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={isAddOpen} onClose={() => { setIsAddOpen(false); reset(); }} title="Add Lab Test">
          <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700">Name</label>
              <input {...register('name', { required: true })} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Code</label>
              <input {...register('code')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Category</label>
              <input {...register('category')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Price</label>
              <input type="number" step="0.01" {...register('price')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Description</label>
              <textarea {...register('description')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelected(null); resetEdit(); }} title="Edit Lab Test">
          <form onSubmit={handleEdit(onEdit)} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700">Name</label>
              <input {...regEdit('name', { required: true })} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Code</label>
              <input {...regEdit('code')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Category</label>
              <input {...regEdit('category')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Price</label>
              <input type="number" step="0.01" {...regEdit('price')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Description</label>
              <textarea {...regEdit('description')} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setIsEditOpen(false); setSelected(null); resetEdit(); }} className="px-4 py-2 border rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

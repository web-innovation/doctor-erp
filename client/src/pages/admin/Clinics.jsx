import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit, FiLock, FiEye, FiUnlock } from 'react-icons/fi';
import adminService from '../../services/adminService';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';

const Clinics = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [formData, setFormData] = useState({
    clinicName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    phone: '',
    address: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  useEffect(() => {
    fetchClinics();
  }, [pagination.page, search]);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getClinics({
        page: pagination.page,
        limit: pagination.limit,
        search,
      });
      setClinics(data.clinics);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (error) {
      console.error('Failed to fetch clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminService.createClinic(formData);
      setShowCreateModal(false);
      resetForm();
      fetchClinics();
    } catch (error) {
      console.error('Failed to create clinic:', error);
      alert(error.response?.data?.message || 'Failed to create clinic');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateClinic(selectedClinic.id, {
        name: formData.clinicName,
        phone: formData.phone,
        address: formData.address,
      });
      setShowEditModal(false);
      resetForm();
      fetchClinics();
    } catch (error) {
      console.error('Failed to update clinic:', error);
      alert(error.response?.data?.message || 'Failed to update clinic');
    }
  };

  const handleDelete = async () => {
    try {
      await adminService.blockClinic(selectedClinic.id);
      setShowDeleteModal(false);
      setSelectedClinic(null);
      fetchClinics();
    } catch (error) {
      console.error('Failed to block clinic:', error);
      alert(error.response?.data?.message || 'Failed to block clinic');
    }
  };

  const handleActivate = async (clinic) => {
    try {
      await adminService.unblockClinic(clinic.id);
      fetchClinics();
    } catch (error) {
      console.error('Failed to unblock clinic:', error);
      alert(error.response?.data?.message || 'Failed to unblock clinic');
    }
  };

  const openEditModal = (clinic) => {
    setSelectedClinic(clinic);
    setFormData({
      clinicName: clinic.name,
      phone: clinic.phone || '',
      address: clinic.address || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (clinic) => {
    setSelectedClinic(clinic);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      clinicName: '',
      ownerName: '',
      ownerEmail: '',
      ownerPassword: '',
      phone: '',
      address: '',
    });
    setSelectedClinic(null);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
          <p className="text-gray-600">Manage all clinics on the platform</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <FiPlus className="mr-2" /> Add Clinic
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clinics..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          />
        </div>
      </div>

      {/* Clinics Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clinic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Limits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clinics.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No clinics found
                      </td>
                    </tr>
                  ) : (
                    clinics.map((clinic) => (
                      <tr key={clinic.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{clinic.name}</div>
                          <div className="text-sm text-gray-500">
                            Created {new Date(clinic.createdAt).toLocaleDateString('en-GB')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{clinic.owner?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{clinic.owner?.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{clinic.phone || '-'}</div>
                          <div className="text-sm text-gray-500 truncate max-w-[200px]">
                            {clinic.address || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="text-gray-900">
                            {clinic._count?.users || 0} users
                          </div>
                          <div className="text-gray-500">
                            {clinic._count?.patients || 0} patients
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <div className="text-gray-900">
                            Staff: {clinic?.accessControls?.staffLimit ?? 'No limit'}
                          </div>
                          <div className="text-gray-500">
                            Upload/month: {clinic?.accessControls?.invoiceUploadLimit?.monthly ?? 'No limit'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              clinic.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {clinic.isActive ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Link
                              to={`/admin/clinics/${clinic.id}`}
                              className="text-purple-600 hover:text-purple-900 p-1"
                              title="View Details"
                            >
                              <FiEye />
                            </Link>
                            <button
                              onClick={() => openEditModal(clinic)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Edit"
                            >
                              <FiEdit />
                            </button>
                            {clinic.isActive ? (
                              <button
                                onClick={() => openDeleteModal(clinic)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Block Clinic"
                              >
                                <FiLock />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(clinic)}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Unblock Clinic"
                              >
                                <FiUnlock />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} clinics
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Clinic Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Clinic"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Clinic Name"
            value={formData.clinicName}
            onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
            required
          />
          <Input
            label="Owner Name"
            value={formData.ownerName}
            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            required
          />
          <Input
            label="Owner Email"
            type="email"
            value={formData.ownerEmail}
            onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
            required
          />
          <Input
            label="Owner Password"
            type="password"
            value={formData.ownerPassword}
            onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
            required
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Create Clinic</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Clinic Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Clinic"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Clinic Name"
            value={formData.clinicName}
            onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
            required
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Update Clinic</Button>
          </div>
        </form>
      </Modal>

      {/* Block Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedClinic(null);
        }}
        title="Block Clinic"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to block <strong>{selectedClinic?.name}</strong>? All users will
            be deactivated and unable to access the clinic until it is unblocked.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedClinic(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Block Clinic
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Clinics;

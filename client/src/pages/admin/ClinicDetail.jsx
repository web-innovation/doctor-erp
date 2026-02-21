import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiUsers,
  FiCalendar,
  FiFileText,
  FiDollarSign,
  FiActivity,
  FiEdit,
  FiUserPlus,
  FiTrash2,
  FiLock,
  FiUnlock,
  FiKey,
  FiUpload,
  FiSettings,
} from 'react-icons/fi';
import adminService from '../../services/adminService';
import Button from '../../components/common/Button';
import StatsCard from '../../components/common/StatsCard';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';

const ClinicDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showDeleteStaffModal, setShowDeleteStaffModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'RECEPTIONIST',
    password: '',
  });
  const [accessControls, setAccessControls] = useState({
    invoiceUploadLimit: { monthly: '', yearly: '' },
    staffLimit: '',
    disabledPermissionsText: ''
  });
  const [savingControls, setSavingControls] = useState(false);
  const [setupFile, setSetupFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState(null);

  const roleOptions = [
    { value: 'DOCTOR', label: 'Doctor' },
    { value: 'RECEPTIONIST', label: 'Receptionist' },
    { value: 'NURSE', label: 'Nurse' },
    { value: 'PHARMACIST', label: 'Pharmacist' },
    { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
    { value: 'ACCOUNTANT', label: 'Accountant' },
  ];

  useEffect(() => {
    fetchClinic();
  }, [id]);

  const fetchClinic = async () => {
    try {
      setLoading(true);
      const data = await adminService.getClinic(id);
      setClinic(data);
      const controls = data.accessControls || {};
      setAccessControls({
        invoiceUploadLimit: {
          monthly: controls?.invoiceUploadLimit?.monthly ?? '',
          yearly: controls?.invoiceUploadLimit?.yearly ?? ''
        },
        staffLimit: controls?.staffLimit ?? '',
        disabledPermissionsText: Array.isArray(controls?.disabledPermissions) ? controls.disabledPermissions.join('\n') : ''
      });
      setFormData({
        name: data.name,
        phone: data.phone || '',
        address: data.address || '',
      });
    } catch (error) {
      console.error('Failed to fetch clinic:', error);
      navigate('/admin/clinics');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await adminService.updateClinic(id, formData);
      setShowEditModal(false);
      fetchClinic();
    } catch (error) {
      console.error('Failed to update clinic:', error);
      alert(error.response?.data?.message || 'Failed to update clinic');
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const result = await adminService.addStaffToClinic(id, staffFormData);
      setShowAddStaffModal(false);
      setStaffFormData({ name: '', email: '', phone: '', role: 'RECEPTIONIST', password: '' });
      fetchClinic();
      if (result.tempPassword) {
        alert(`Staff added successfully! Temporary password: ${result.tempPassword}`);
      } else {
        alert('Staff added successfully!');
      }
    } catch (error) {
      console.error('Failed to add staff:', error);
      alert(error.response?.data?.message || 'Failed to add staff member');
    }
  };

  const handleRemoveStaff = async () => {
    if (!selectedStaff) return;
    try {
      await adminService.removeStaffFromClinic(id, selectedStaff.id);
      setShowDeleteStaffModal(false);
      setSelectedStaff(null);
      fetchClinic();
    } catch (error) {
      console.error('Failed to remove staff:', error);
      alert(error.response?.data?.message || 'Failed to remove staff member');
    }
  };

  const handleToggleStaffStatus = async (staff) => {
    try {
      await adminService.toggleUserStatus(staff.id);
      fetchClinic();
    } catch (error) {
      console.error('Failed to toggle staff status:', error);
      alert(error.response?.data?.message || 'Failed to update staff status');
    }
  };

  const handleBlockUnblock = async () => {
    try {
      if (clinic.isActive) {
        await adminService.blockClinic(id);
      } else {
        await adminService.unblockClinic(id);
      }
      setShowBlockModal(false);
      fetchClinic();
    } catch (error) {
      console.error('Failed to update clinic status:', error);
      alert(error.response?.data?.message || 'Failed to update clinic status');
    }
  };

  const handleResetPassword = async (staff) => {
    if (!confirm(`Reset password for ${staff.name}? A new password will be set.`)) return;
    try {
      const result = await adminService.resetUserPassword(staff.id);
      alert(`Password reset successfully! ${result.tempPassword ? `New password: ${result.tempPassword}` : ''}`);
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleSaveControls = async () => {
    try {
      setSavingControls(true);
      const disabledPermissions = accessControls.disabledPermissionsText
        .split(/[\n,]+/)
        .map((v) => v.trim())
        .filter(Boolean);
      await adminService.updateClinicAccessControls(id, {
        invoiceUploadLimit: {
          monthly: accessControls.invoiceUploadLimit.monthly === '' ? null : Number(accessControls.invoiceUploadLimit.monthly),
          yearly: accessControls.invoiceUploadLimit.yearly === '' ? null : Number(accessControls.invoiceUploadLimit.yearly)
        },
        staffLimit: accessControls.staffLimit === '' ? null : Number(accessControls.staffLimit),
        disabledPermissions
      });
      alert('Access controls updated');
      fetchClinic();
    } catch (error) {
      console.error('Failed to save controls:', error);
      alert(error.response?.data?.message || 'Failed to update controls');
    } finally {
      setSavingControls(false);
    }
  };

  const handleImportSetup = async (dryRun = false) => {
    if (!setupFile) {
      alert('Please select a CSV or XLSX file');
      return;
    }
    try {
      setImporting(true);
      const fd = new FormData();
      fd.append('file', setupFile);
      const result = await adminService.importClinicSetup(id, fd, { dryRun });
      setLastImportResult(result?.data || null);
      alert(dryRun ? 'Dry run completed' : 'Clinic setup import completed');
      fetchClinic();
    } catch (error) {
      console.error('Failed to import setup:', error);
      alert(error.response?.data?.message || 'Failed to import setup');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await adminService.downloadSetupTemplate();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'clinic_setup_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Template download failed:', error);
      alert(error.response?.data?.message || 'Failed to download template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!clinic) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/clinics')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
            <p className="text-gray-600">
              Created on {new Date(clinic.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              clinic.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {clinic.isActive ? 'Active' : 'Blocked'}
          </span>
          <Button
            variant={clinic.isActive ? 'danger' : 'primary'}
            onClick={() => setShowBlockModal(true)}
          >
            {clinic.isActive ? <><FiLock className="mr-2" /> Block</> : <><FiUnlock className="mr-2" /> Unblock</>}
          </Button>
          <Button onClick={() => setShowEditModal(true)}>
            <FiEdit className="mr-2" /> Edit
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Users" value={clinic.users?.length || clinic._count?.users || 0} icon={FiUsers} color="blue" />
        <StatsCard
          title="Total Patients"
          value={clinic.stats?.totalPatients || clinic._count?.patients || 0}
          icon={FiUsers}
          color="green"
        />
        <StatsCard
          title="Total Appointments"
          value={clinic.stats?.totalAppointments || clinic._count?.appointments || 0}
          icon={FiCalendar}
          color="purple"
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${(clinic.stats?.totalRevenue || 0).toLocaleString()}`}
          icon={FiDollarSign}
          color="orange"
        />
      </div>

      {/* Clinic Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500">Phone</label>
            <p className="mt-1 text-gray-900">{clinic.phone || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">Email</label>
            <p className="mt-1 text-gray-900">{clinic.email || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-500">Address</label>
            <p className="mt-1 text-gray-900">
              {[clinic.address, clinic.city, clinic.state, clinic.pincode].filter(Boolean).join(', ') || '-'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">GST Number</label>
            <p className="mt-1 text-gray-900">{clinic.gstNumber || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500">License Number</label>
            <p className="mt-1 text-gray-900">{clinic.licenseNumber || '-'}</p>
          </div>
        </div>
      </div>

      {/* Controls & Setup */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <FiSettings className="text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Clinic Access Controls</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="number"
            min="0"
            label="Monthly Invoice Upload Limit"
            value={accessControls.invoiceUploadLimit.monthly}
            onChange={(e) => setAccessControls((s) => ({
              ...s,
              invoiceUploadLimit: { ...s.invoiceUploadLimit, monthly: e.target.value }
            }))}
          />
          <Input
            type="number"
            min="0"
            label="Yearly Invoice Upload Limit"
            value={accessControls.invoiceUploadLimit.yearly}
            onChange={(e) => setAccessControls((s) => ({
              ...s,
              invoiceUploadLimit: { ...s.invoiceUploadLimit, yearly: e.target.value }
            }))}
          />
          <Input
            type="number"
            min="0"
            label="Staff Limit"
            value={accessControls.staffLimit}
            onChange={(e) => setAccessControls((s) => ({ ...s, staffLimit: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Disabled Permissions (one per line or comma separated)
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-3 text-sm"
            rows={4}
            placeholder="Example: billing:create"
            value={accessControls.disabledPermissionsText}
            onChange={(e) => setAccessControls((s) => ({ ...s, disabledPermissionsText: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveControls} loading={savingControls}>Save Controls</Button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Download Setup Template
          </button>
        </div>

        <div className="border-t pt-5">
          <h3 className="font-semibold text-gray-900 mb-2">One-click Clinic Setup Import</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload the template spreadsheet (XLSX) to create staff, pharmacy products, agents, labs, and lab tests.
          </p>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setSetupFile(e.target.files?.[0] || null)} />
            <Button variant="outline" onClick={() => handleImportSetup(true)} loading={importing}>
              Dry Run
            </Button>
            <Button onClick={() => handleImportSetup(false)} loading={importing}>
              <FiUpload className="mr-2" /> Import Setup
            </Button>
          </div>
          {lastImportResult?.summary && (
            <div className="mt-4 text-sm bg-gray-50 border rounded-lg p-3 space-y-1">
              <p>Rows: {lastImportResult.summary.rows}</p>
              <p>Staff created/updated: {lastImportResult.summary.staff?.created || 0}/{lastImportResult.summary.staff?.updated || 0}</p>
              <p>Pharmacy created/updated: {lastImportResult.summary.pharmacy?.created || 0}/{lastImportResult.summary.pharmacy?.updated || 0}</p>
              <p>Labs created/updated: {lastImportResult.summary.labs?.created || 0}/{lastImportResult.summary.labs?.updated || 0}</p>
              <p>Lab tests created/updated: {lastImportResult.summary.labTests?.created || 0}/{lastImportResult.summary.labTests?.updated || 0}</p>
              <p>Agents created/updated: {lastImportResult.summary.agents?.created || 0}/{lastImportResult.summary.agents?.updated || 0}</p>
              {(lastImportResult.summary.errors || []).length > 0 && (
                <p className="text-red-600">Errors: {(lastImportResult.summary.errors || []).slice(0, 3).join(' | ')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
          <Button onClick={() => setShowAddStaffModal(true)}>
            <FiUserPlus className="mr-2" /> Add Staff
          </Button>
        </div>
        {clinic.users?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
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
                {clinic.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-medium text-sm">
                            {user.name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <span className="ml-3 font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'DOCTOR' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Reset Password"
                        >
                          <FiKey className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStaffStatus(user)}
                          className={`p-1 ${user.isActive ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? <FiLock className="h-4 w-4" /> : <FiUnlock className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStaff(user);
                            setShowDeleteStaffModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove Staff"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No staff members found</p>
        )}
      </div>

      {/* Edit Clinic Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Clinic">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Clinic Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Clinic</Button>
          </div>
        </form>
      </Modal>

      {/* Add Staff Modal */}
      <Modal isOpen={showAddStaffModal} onClose={() => setShowAddStaffModal(false)} title="Add Staff Member">
        <form onSubmit={handleAddStaff} className="space-y-4">
          <Input
            label="Full Name"
            value={staffFormData.name}
            onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={staffFormData.email}
            onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            value={staffFormData.phone}
            onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
            required
          />
          <Select
            label="Role"
            options={roleOptions}
            value={staffFormData.role}
            onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
          />
          <Input
            label="Password (leave empty for auto-generated)"
            type="password"
            value={staffFormData.password}
            onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
            placeholder="Leave empty for default: password123"
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowAddStaffModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Staff</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Confirmation Modal */}
      <Modal
        isOpen={showDeleteStaffModal}
        onClose={() => {
          setShowDeleteStaffModal(false);
          setSelectedStaff(null);
        }}
        title="Remove Staff Member"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to remove <strong>{selectedStaff?.name}</strong> from this clinic? 
            They will be deactivated and unable to access the system.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteStaffModal(false);
                setSelectedStaff(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemoveStaff}>
              Remove Staff
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block/Unblock Clinic Confirmation Modal */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title={clinic.isActive ? 'Block Clinic' : 'Unblock Clinic'}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {clinic.isActive
              ? `Are you sure you want to block "${clinic.name}"? All users will be deactivated and unable to access the system.`
              : `Are you sure you want to unblock "${clinic.name}"? All users will be reactivated and able to access the system.`
            }
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowBlockModal(false)}>
              Cancel
            </Button>
            <Button variant={clinic.isActive ? 'danger' : 'primary'} onClick={handleBlockUnblock}>
              {clinic.isActive ? 'Block Clinic' : 'Unblock Clinic'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClinicDetail;

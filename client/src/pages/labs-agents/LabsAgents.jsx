import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFlask,
  FaUserTie,
  FaHandHoldingUsd,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal';
import labsAgentsService from '../../services/labsAgentsService';

const TABS = [
  { id: 'labs', label: 'Labs', icon: FaFlask },
  { id: 'agents', label: 'Agents', icon: FaUserTie },
  { id: 'commissions', label: 'Commissions', icon: FaHandHoldingUsd },
];

export default function LabsAgents() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('labs');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [commissionFilter, setCommissionFilter] = useState('all');
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm();

  const {
    register: registerPayment,
    handleSubmit: handlePaymentSubmit,
    reset: resetPayment,
  } = useForm();

  // Fetch labs
  const { data: labsData, isLoading: labsLoading } = useQuery({
    queryKey: ['labs', currentPage, pageSize, searchQuery],
    queryFn: () => labsAgentsService.getLabs({ page: currentPage, limit: pageSize, search: searchQuery }),
    enabled: activeTab === 'labs',
  });

  // Fetch agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents', currentPage, pageSize, searchQuery],
    queryFn: () => labsAgentsService.getAgents({ page: currentPage, limit: pageSize, search: searchQuery }),
    enabled: activeTab === 'agents',
  });

  // Fetch commissions
  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ['commissions', currentPage, pageSize, commissionFilter],
    queryFn: () =>
      labsAgentsService.getCommissions({
        page: currentPage,
        limit: pageSize,
        status: commissionFilter === 'all' ? undefined : commissionFilter,
      }),
    enabled: activeTab === 'commissions',
  });

  const labs = labsData?.data || [];
  const agents = agentsData?.data || [];
  const commissions = commissionsData?.data || [];
  const totalPages = activeTab === 'labs' 
    ? (labsData?.pagination?.totalPages || 1) 
    : activeTab === 'agents' 
    ? (agentsData?.pagination?.totalPages || 1) 
    : (commissionsData?.pagination?.totalPages || 1);
  const totalCount = activeTab === 'labs' 
    ? (labsData?.pagination?.total || 0) 
    : activeTab === 'agents' 
    ? (agentsData?.pagination?.total || 0) 
    : (commissionsData?.pagination?.total || 0);

  // Lab mutations
  const createLabMutation = useMutation({
    mutationFn: (data) => labsAgentsService.createLab(data),
    onSuccess: () => {
      toast.success('Lab added successfully');
      queryClient.invalidateQueries(['labs']);
      setIsAddModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add lab');
    },
  });

  const updateLabMutation = useMutation({
    mutationFn: ({ id, data }) => labsAgentsService.updateLab(id, data),
    onSuccess: () => {
      toast.success('Lab updated successfully');
      queryClient.invalidateQueries(['labs']);
      setIsEditModalOpen(false);
      setSelectedItem(null);
      resetEdit();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update lab');
    },
  });

  const deleteLabMutation = useMutation({
    mutationFn: (id) => labsAgentsService.deleteLab(id),
    onSuccess: () => {
      toast.success('Lab deleted successfully');
      queryClient.invalidateQueries(['labs']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete lab');
    },
  });

  // Agent mutations
  const createAgentMutation = useMutation({
    mutationFn: (data) => labsAgentsService.createAgent(data),
    onSuccess: () => {
      toast.success('Agent added successfully');
      queryClient.invalidateQueries(['agents']);
      setIsAddModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add agent');
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }) => labsAgentsService.updateAgent(id, data),
    onSuccess: () => {
      toast.success('Agent updated successfully');
      queryClient.invalidateQueries(['agents']);
      setIsEditModalOpen(false);
      setSelectedItem(null);
      resetEdit();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update agent');
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: (id) => labsAgentsService.deleteAgent(id),
    onSuccess: () => {
      toast.success('Agent deleted successfully');
      queryClient.invalidateQueries(['agents']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete agent');
    },
  });

  // Commission payment mutation
  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }) => labsAgentsService.markCommissionPaid(id, data),
    onSuccess: () => {
      toast.success('Commission marked as paid');
      queryClient.invalidateQueries(['commissions']);
      setIsPaymentModalOpen(false);
      setSelectedItem(null);
      resetPayment();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    },
  });

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSearchQuery('');
  };

  const onAddItem = (data) => {
    if (activeTab === 'labs') {
      createLabMutation.mutate({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        contactPerson: data.contactPerson,
        commissionType: 'PERCENTAGE',
        commissionValue: data.commissionRate ? parseFloat(data.commissionRate) : 0,
      });
    } else if (activeTab === 'agents') {
      createAgentMutation.mutate({
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        commissionType: 'PERCENTAGE',
        commissionValue: data.commissionRate ? parseFloat(data.commissionRate) : 0,
      });
    }
  };

  const onEditItem = (data) => {
    if (!selectedItem) return;

    if (activeTab === 'labs') {
      updateLabMutation.mutate({
        id: selectedItem.id,
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          contactPerson: data.contactPerson,
          commissionValue: data.commissionRate ? parseFloat(data.commissionRate) : undefined,
        },
      });
    } else if (activeTab === 'agents') {
      updateAgentMutation.mutate({
        id: selectedItem.id,
        data: {
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          commissionValue: data.commissionRate ? parseFloat(data.commissionRate) : undefined,
        },
      });
    }
  };

  const onPayment = (data) => {
    if (!selectedItem) return;
    markPaidMutation.mutate({
      id: selectedItem.id,
      data: {
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        paymentDate: data.paymentDate,
        notes: data.notes,
      },
    });
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setEditValue('name', item.name);
    setEditValue('email', item.email);
    setEditValue('phone', item.phone);
    setEditValue('address', item.address);
    setEditValue('commissionRate', item.commissionRate);
    if (activeTab === 'labs') {
      setEditValue('contactPerson', item.contactPerson);
      setEditValue('services', item.services?.join(', '));
    } else if (activeTab === 'agents') {
      setEditValue('area', item.area);
      setEditValue('bankDetails', item.bankDetails);
    }
    setIsEditModalOpen(true);
  };

  const openPaymentModal = (commission) => {
    setSelectedItem(commission);
    setIsPaymentModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      if (activeTab === 'labs') {
        deleteLabMutation.mutate(item.id);
      } else if (activeTab === 'agents') {
        deleteAgentMutation.mutate(item.id);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isLoading = labsLoading || agentsLoading || commissionsLoading;

  // Render Labs Table
  const renderLabsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Lab Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Contact Person
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Commission Rate
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {labs.map((lab) => (
            <tr key={lab.id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FaFlask className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{lab.name}</p>
                    <p className="text-sm text-gray-500">{lab.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {lab.contactPerson || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {lab.phone || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {lab.commissionRate || 0}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    lab.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {lab.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(lab)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(lab)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render Agents Table
  const renderAgentsTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Agent Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Area
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Commission Rate
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {agents.map((agent) => (
            <tr key={agent.id} className="hover:bg-gray-50 transition">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FaUserTie className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{agent.name}</p>
                    <p className="text-sm text-gray-500">{agent.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {agent.area || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                {agent.phone || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {agent.commissionRate || 0}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    agent.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {agent.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(agent)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(agent)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render Commissions Table
  const renderCommissionsTable = () => (
    <>
      {/* Filter */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Status:</span>
          {['all', 'pending', 'paid'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setCommissionFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                commissionFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Partner
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commissions.map((commission) => (
              <tr key={commission.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        commission.partnerType === 'lab' ? 'bg-purple-100' : 'bg-orange-100'
                      }`}
                    >
                      {commission.partnerType === 'lab' ? (
                        <FaFlask className="text-purple-600" />
                      ) : (
                        <FaUserTie className="text-orange-600" />
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{commission.partnerName}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="capitalize text-gray-600">{commission.partnerType}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-mono text-sm text-gray-600">
                    {commission.referenceNo || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(commission.amount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {formatDate(commission.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      commission.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {commission.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {commission.status !== 'paid' && (
                    <button
                      onClick={() => openPaymentModal(commission)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                    >
                      <FaCheck className="text-xs" />
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const getEmptyIcon = () => {
    if (activeTab === 'labs') return FaFlask;
    if (activeTab === 'agents') return FaUserTie;
    return FaHandHoldingUsd;
  };

  const getEmptyMessage = () => {
    if (activeTab === 'labs') return 'No labs found';
    if (activeTab === 'agents') return 'No agents found';
    return 'No commissions found';
  };

  const EmptyIcon = getEmptyIcon();
  const currentData = activeTab === 'labs' ? labs : activeTab === 'agents' ? agents : commissions;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Labs & Agents</h1>
            <p className="text-gray-500 mt-1">Manage labs, agents, and commissions</p>
          </div>
          {activeTab !== 'commissions' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <FaPlus />
              Add {activeTab === 'labs' ? 'Lab' : 'Agent'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search (for labs and agents only) */}
          {activeTab !== 'commissions' && (
            <div className="p-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder={`Search ${activeTab}...`}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : currentData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <EmptyIcon className="text-4xl mb-4" />
              <p className="font-medium">{getEmptyMessage()}</p>
              <p className="text-sm mt-1">
                {activeTab !== 'commissions'
                  ? `Add your first ${activeTab === 'labs' ? 'lab' : 'agent'} to get started`
                  : 'Commissions will appear here when generated'}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'labs' && renderLabsTable()}
              {activeTab === 'agents' && renderAgentsTable()}
              {activeTab === 'commissions' && renderCommissionsTable()}

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalCount)} of {totalCount} items
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <FaChevronLeft className="text-gray-600" />
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <FaChevronRight className="text-gray-600" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Add Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            reset();
          }}
          title={`Add ${activeTab === 'labs' ? 'Lab' : 'Agent'}`}
          size="lg"
        >
          <form onSubmit={handleSubmit(onAddItem)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${activeTab === 'labs' ? 'lab' : 'agent'} name`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Phone is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('commissionRate')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter commission rate"
                />
              </div>

              {activeTab === 'labs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    {...register('contactPerson')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contact person name"
                  />
                </div>
              )}

              {activeTab === 'agents' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                  <input
                    type="text"
                    {...register('area')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter area/region"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  {...register('address')}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter address"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  reset();
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLabMutation.isPending || createAgentMutation.isPending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {createLabMutation.isPending || createAgentMutation.isPending
                  ? 'Adding...'
                  : `Add ${activeTab === 'labs' ? 'Lab' : 'Agent'}`}
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
            resetEdit();
          }}
          title={`Edit ${activeTab === 'labs' ? 'Lab' : 'Agent'}`}
          size="lg"
        >
          <form onSubmit={handleEditSubmit(onEditItem)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...registerEdit('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  {...registerEdit('email')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...registerEdit('phone', { required: 'Phone is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editErrors.phone && (
                  <p className="mt-1 text-sm text-red-500">{editErrors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...registerEdit('commissionRate')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {activeTab === 'labs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    {...registerEdit('contactPerson')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {activeTab === 'agents' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                  <input
                    type="text"
                    {...registerEdit('area')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  {...registerEdit('address')}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedItem(null);
                  resetEdit();
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateLabMutation.isPending || updateAgentMutation.isPending}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {updateLabMutation.isPending || updateAgentMutation.isPending
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Payment Modal */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedItem(null);
            resetPayment();
          }}
          title="Mark Commission as Paid"
          size="md"
        >
          <form onSubmit={handlePaymentSubmit(onPayment)} className="space-y-4">
            {selectedItem && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">Partner: <span className="font-medium text-gray-900">{selectedItem.partnerName}</span></p>
                <p className="text-sm text-gray-600 mt-1">Amount: <span className="font-medium text-gray-900">{formatCurrency(selectedItem.amount)}</span></p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                {...registerPayment('paymentMethod', { required: 'Payment method is required' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Reference
              </label>
              <input
                type="text"
                {...registerPayment('paymentReference')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Transaction ID / Cheque No."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                {...registerPayment('paymentDate')}
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...registerPayment('notes')}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedItem(null);
                  resetPayment();
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={markPaidMutation.isPending}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition"
              >
                {markPaidMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

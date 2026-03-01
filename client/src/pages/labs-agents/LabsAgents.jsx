
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaFlask,
  FaHandHoldingUsd,
  FaUserTie,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal';
import { useHasPerm } from '../../context/AuthContext';
import labsAgentsService from '../../services/labsAgentsService';

const ALL_TABS = [
  { id: 'labs', label: 'Labs', icon: FaFlask },
  { id: 'agents', label: 'Agents', icon: FaUserTie },
  { id: 'commissions', label: 'Commissions', icon: FaHandHoldingUsd },
];

export default function LabsAgents() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const isLabsRoute = location.pathname === '/labs' || location.pathname.startsWith('/labs/');
  const tabs = isLabsRoute
    ? ALL_TABS.filter((t) => t.id === 'labs')
    : ALL_TABS.filter((t) => t.id !== 'labs');
  const searchParams = new URLSearchParams(location.search);
  const initialTabFromQuery = searchParams.get('tab');
  const initialTab = tabs.some((t) => t.id === initialTabFromQuery) ? initialTabFromQuery : tabs[0].id;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) setActiveTab(tabs[0].id);
  }, [activeTab, tabs]);

  useEffect(() => {
    const nextTabFromQuery = searchParams.get('tab');
    const routeTabs = (location.pathname === '/labs' || location.pathname.startsWith('/labs/'))
      ? ALL_TABS.filter((t) => t.id === 'labs')
      : ALL_TABS.filter((t) => t.id !== 'labs');
    const nextTab = routeTabs.some((t) => t.id === nextTabFromQuery) ? nextTabFromQuery : routeTabs[0].id;
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
      setCurrentPage(1);
      setSearchQuery('');
    }
  }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [commissionFilter, setCommissionFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddLabModalOpen, setIsAddLabModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const {
    register: registerLab,
    handleSubmit: handleLabSubmit,
    reset: resetLab,
    formState: { errors: labErrors },
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

  const { data: labsData, isLoading: labsLoading } = useQuery({
    queryKey: ['labs', currentPage, pageSize, searchQuery],
    queryFn: () => labsAgentsService.getLabs({ page: currentPage, limit: pageSize, search: searchQuery }),
    enabled: activeTab === 'labs',
  });

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents', currentPage, pageSize, searchQuery],
    queryFn: () => labsAgentsService.getAgents({ page: currentPage, limit: pageSize, search: searchQuery }),
    enabled: activeTab === 'agents',
  });

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

  const totals = useMemo(() => {
    const totalLabs = labsData?.pagination?.total || 0;
    const activeLabsOnPage = labs.filter((l) => l.isActive !== false).length;
    const totalAgents = agentsData?.pagination?.total || 0;
    const activeAgentsOnPage = agents.filter((a) => a.isActive !== false).length;
    const pendingCount = commissions.filter((c) => (c.status || '').toUpperCase() !== 'PAID').length;
    const pendingAmount = commissions
      .filter((c) => (c.status || '').toUpperCase() !== 'PAID')
      .reduce((s, c) => s + Number(c.amount || 0), 0);
    return { totalLabs, activeLabsOnPage, totalAgents, activeAgentsOnPage, pendingCount, pendingAmount };
  }, [labs, agents, commissions, labsData, agentsData]);

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

  const createLabMutation = useMutation({
    mutationFn: (data) => labsAgentsService.createLab(data),
    onSuccess: () => {
      toast.success('Lab added successfully');
      queryClient.invalidateQueries(['labs']);
      setIsAddLabModalOpen(false);
      resetLab();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add lab');
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

  const onAddAgent = (data) => {
    createAgentMutation.mutate({
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      commissionType: 'PERCENTAGE',
      commissionValue: data.commissionRate ? parseFloat(data.commissionRate) : 0,
      discountAllowed: data.discountAllowed ? parseFloat(data.discountAllowed) : 0,
    });
  };

  const onAddLab = (data) => {
    createLabMutation.mutate({
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      contactPerson: data.contactPerson,
      commissionType: 'PERCENTAGE',
      commissionValue: data.commissionValue ? parseFloat(data.commissionValue) : 0,
    });
  };

  const onEditAgent = (data) => {
    if (!selectedItem) return;
    updateAgentMutation.mutate({
      id: selectedItem.id,
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        commissionValue: data.commissionRate ? parseFloat(data.commissionRate) : undefined,
        discountAllowed: data.discountAllowed ? parseFloat(data.discountAllowed) : undefined,
      },
    });
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
    setEditValue('commissionRate', item.commissionRate || item.commissionValue);
    setEditValue('discountAllowed', item.discountAllowed || 0);
    setIsEditModalOpen(true);
  };

  const openPaymentModal = (commission) => {
    setSelectedItem(commission);
    setIsPaymentModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteAgentMutation.mutate(item.id);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isLoading = labsLoading || agentsLoading || commissionsLoading;

  const canCreateAgent = useHasPerm('agents:create', ['SUPER_ADMIN', 'DOCTOR']);
  const canCreateLab = useHasPerm('labs:manage', ['SUPER_ADMIN', 'DOCTOR', 'ADMIN']);
  const canUpdateAgent = useHasPerm('agents:update', ['SUPER_ADMIN', 'DOCTOR']);
  const canManageAgents = useHasPerm('agents:manage', ['SUPER_ADMIN', 'DOCTOR']);
  const canPayCommissions = useHasPerm('commissions:pay', ['SUPER_ADMIN', 'ACCOUNTANT']);
  const renderLabs = () => (
    <div className="grid gap-4">
      {labs.map((lab) => (
        <div key={lab.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <FaFlask />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{lab.name}</h3>
                <div className="text-sm text-gray-600 flex flex-wrap gap-4 mt-1">
                  <span className="inline-flex items-center gap-2"><FaPhone /> {lab.phone || '-'}</span>
                  <span className="inline-flex items-center gap-2"><FaEnvelope /> {lab.email || '-'}</span>
                  <span className="inline-flex items-center gap-2"><FaMapMarkerAlt /> {lab.address || '-'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                    Commission: {lab.commissionValue || 0}%
                  </span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    lab.isActive !== false ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {lab.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/labs-agents/${lab.id}/tests`}
                className="px-3 py-2 text-sm rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50"
              >
                Manage Tests
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
  const renderAgents = () => (
    <div className="grid gap-4">
      {agents.map((agent) => (
        <div key={agent.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <FaUserTie />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                <div className="text-sm text-gray-600 flex flex-wrap gap-4 mt-1">
                  <span className="inline-flex items-center gap-2"><FaPhone /> {agent.phone || '-'}</span>
                  <span className="inline-flex items-center gap-2"><FaEnvelope /> {agent.email || '-'}</span>
                  <span className="inline-flex items-center gap-2"><FaMapMarkerAlt /> {agent.address || '-'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                    Commission: {agent.commissionRate || agent.commissionValue || 0}%
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                    Discount Allowed: {agent.discountAllowed || 0}%
                  </span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    agent.isActive !== false ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {agent.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canUpdateAgent && (
                <button
                  onClick={() => openEditModal(agent)}
                  className="px-3 py-2 text-sm rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <FaEdit className="inline-block mr-2" /> Edit
                </button>
              )}
              {canManageAgents && (
                <button
                  onClick={() => handleDelete(agent)}
                  className="px-3 py-2 text-sm rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <FaTrash className="inline-block mr-2" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCommissions = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Agent</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {commissions.map((commission) => (
            <tr key={commission.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{commission.agent?.name || commission.partnerName || 'Agent'}</div>
                <div className="text-sm text-gray-500">Ref: {commission.reference || commission.refNo || '-'}</div>
              </td>
              <td className="px-6 py-4 font-semibold text-gray-900">
                {formatCurrency(commission.amount)}
              </td>
              <td className="px-6 py-4 text-gray-600">
                {formatDate(commission.createdAt)}
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  (commission.status || '').toUpperCase() === 'PAID'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {(commission.status || 'PENDING').toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                {canPayCommissions && (commission.status || '').toUpperCase() !== 'PAID' && (
                  <button
                    onClick={() => openPaymentModal(commission)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                  >
                    <FaCheck /> Mark Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const title = activeTab === 'labs' ? 'Labs' : 'Agents & Commissions';
  const subtitle = activeTab === 'labs'
    ? 'Manage referral labs and open their test catalog from here.'
    : 'Hire agents on commission to bring patients to your clinic. Track payouts in one place.';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-amber-50 via-white to-blue-50 border border-gray-100 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600 mt-1">{subtitle}</p>
            </div>
            {activeTab === 'labs' && canCreateLab && (
              <button
                onClick={() => setIsAddLabModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-sky-700"
              >
                <FaPlus /> Add Lab
              </button>
            )}
            {activeTab === 'agents' && canCreateAgent && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-amber-700"
              >
                <FaPlus /> Add Agent
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{activeTab === 'labs' ? 'Total Labs' : 'Total Agents'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeTab === 'labs' ? totals.totalLabs : totals.totalAgents}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active (Page)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeTab === 'labs' ? totals.activeLabsOnPage : totals.activeAgentsOnPage}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Commissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totals.pendingCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.pendingAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          {tabs.length > 1 && (
            <div className="flex border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {(activeTab === 'agents' || activeTab === 'labs') && (
            <div className="p-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder={activeTab === 'labs' ? 'Search labs by name or contact person...' : 'Search agents by name or phone...'}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'commissions' && (
            <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-gray-500">Track commission payouts for patient referrals.</div>
              <select
                value={commissionFilter}
                onChange={(e) => { setCommissionFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : activeTab === 'labs' ? (
            labs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FaFlask className="text-4xl mb-3" />
                <p className="font-medium">No labs yet</p>
                <p className="text-sm mt-1">Lab records will appear here once created.</p>
              </div>
            ) : (
              renderLabs()
            )
          ) : activeTab === 'agents' ? (
            agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FaUserTie className="text-4xl mb-3" />
                <p className="font-medium">No agents yet</p>
                <p className="text-sm mt-1">Add your first agent to start tracking referrals.</p>
              </div>
            ) : (
              renderAgents()
            )
          ) : commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FaHandHoldingUsd className="text-4xl mb-3" />
              <p className="font-medium">No commissions yet</p>
              <p className="text-sm mt-1">Commission records will appear here when created.</p>
            </div>
          ) : (
            renderCommissions()
          )}

          {(activeTab === 'labs' ? labs.length : activeTab === 'agents' ? agents.length : commissions.length) > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} items
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft className="text-gray-600" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronRight className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
        <Modal
          isOpen={isAddLabModalOpen}
          onClose={() => {
            setIsAddLabModalOpen(false);
            resetLab();
          }}
          title="Add Lab"
          size="lg"
        >
          <form onSubmit={handleLabSubmit(onAddLab)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lab Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...registerLab('name', { required: 'Lab name is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Lab name"
                />
                {labErrors.name && <p className="mt-1 text-sm text-red-500">{labErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  {...registerLab('contactPerson')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Contact person"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  {...registerLab('phone')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  {...registerLab('email')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  {...registerLab('commissionValue')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  {...registerLab('address')}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Address"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAddLabModalOpen(false);
                  resetLab();
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLabMutation.isPending}
                className="px-4 py-2.5 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {createLabMutation.isPending ? 'Adding...' : 'Add Lab'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            reset();
          }}
          title="Add Agent"
          size="lg"
        >
          <form onSubmit={handleSubmit(onAddAgent)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Agent name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...register('phone', { required: 'Phone is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Phone number"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register('commissionRate')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Allowed (%)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register('discountAllowed')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  {...register('address')}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Address"
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
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAgentMutation.isPending}
                className="px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {createAgentMutation.isPending ? 'Adding...' : 'Add Agent'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
            resetEdit();
          }}
          title="Edit Agent"
          size="lg"
        >
          <form onSubmit={handleEditSubmit(onEditAgent)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...registerEdit('name', { required: 'Name is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {editErrors.name && <p className="mt-1 text-sm text-red-500">{editErrors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  {...registerEdit('email')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  {...registerEdit('phone', { required: 'Phone is required' })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {editErrors.phone && <p className="mt-1 text-sm text-red-500">{editErrors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  {...registerEdit('commissionRate')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Allowed (%)</label>
                <input
                  type="number"
                  step="0.1"
                  {...registerEdit('discountAllowed')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  {...registerEdit('address')}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateAgentMutation.isPending}
                className="px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {updateAgentMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

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
                <p className="text-sm text-gray-600">Agent: <span className="font-medium text-gray-900">{selectedItem.agent?.name || selectedItem.partnerName || 'Agent'}</span></p>
                <p className="text-sm text-gray-600 mt-1">Amount: <span className="font-medium text-gray-900">{formatCurrency(selectedItem.amount)}</span></p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                {...registerPayment('paymentMethod', { required: 'Payment method is required' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
              <input
                type="text"
                {...registerPayment('paymentReference')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Transaction ID / Cheque No."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date" lang="en-GB" placeholder="dd/mm/yyyy"
                {...registerPayment('paymentDate')}
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...registerPayment('notes')}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={markPaidMutation.isPending}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
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

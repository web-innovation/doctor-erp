import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaPrint,
  FaMoneyBillWave,
  FaFileInvoice,
  FaTimes,
  FaCalendarAlt,
} from 'react-icons/fa';
import billingService from '../../services/billingService';
import { useAuth, useHasPerm } from '../../context/AuthContext';
import settingsService from '../../services/settingsService';
import Modal from '../../components/common/Modal';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Billing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // Permission flags — call hooks unconditionally to keep hook order stable
  const canCreateBilling = useHasPerm('billing:create', ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST', 'RECEPTIONIST']);
  const canEditBilling = useHasPerm('billing:edit', ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST', 'RECEPTIONIST']);

  // Fetch bills
  const { data: billsData, isLoading } = useQuery({
    queryKey: ['bills', currentPage, pageSize, searchQuery, filters],
    queryFn: () =>
      billingService.getBills({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        ...filters,
      }),
    placeholderData: (previousData) => previousData,
  });

  const bills = billsData?.data || [];
  const totalPages = billsData?.pagination?.totalPages || 1;
  const totalCount = billsData?.pagination?.total || 0;

  // Record payment mutation
  const paymentMutation = useMutation({
    mutationFn: ({ id, paymentData }) =>
      billingService.recordPayment(id, paymentData),
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries(['bills']);
      setIsPaymentModalOpen(false);
      setSelectedBill(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: '', startDate: '', endDate: '' });
    setCurrentPage(1);
  };

  const openPaymentModal = (bill) => {
    setSelectedBill(bill);
    setIsPaymentModalOpen(true);
  };

  const openViewModal = (bill) => {
    setSelectedBill(bill);
    setIsViewModalOpen(true);
  };

  const handlePrint = (bill) => {
    // Generate print window with bill details
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const itemsHtml = (bill.items || []).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unitPrice?.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.quantity * item.unitPrice)?.toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${bill.billNo || bill.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #333; }
          .header p { margin: 5px 0; color: #666; }
          .bill-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .patient-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #333; color: white; padding: 10px; text-align: left; }
          .totals { text-align: right; margin-top: 20px; }
          .totals p { margin: 5px 0; }
          .totals .total { font-size: 18px; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Docsy ERP</h1>
          <p>Tax Invoice</p>
        </div>
        
        <div class="bill-info">
          <div>
            <strong>Bill No:</strong> ${bill.billNo || bill.id.slice(-8).toUpperCase()}<br>
            <strong>Date:</strong> ${formatDate(bill.createdAt)}
          </div>
          <div style="text-align: right;">
            <strong>Status:</strong> ${bill.paymentStatus || 'PENDING'}
          </div>
        </div>
        
        <div class="patient-info">
          <strong>Patient:</strong> ${bill.patient?.name || 'Unknown'}<br>
          ${bill.patient?.phone ? `<strong>Phone:</strong> ${bill.patient.phone}` : ''}
          ${bill.doctor?.name ? `<br><strong>Doctor:</strong> Dr. ${bill.doctor.name}` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="totals">
          <p><strong>Subtotal:</strong> ₹${bill.subtotal?.toFixed(2) || '0.00'}</p>
          ${bill.discountAmount > 0 ? `<p><strong>Discount:</strong> -₹${bill.discountAmount?.toFixed(2)}</p>` : ''}
          ${bill.taxAmount > 0 ? `<p><strong>Tax:</strong> ₹${bill.taxAmount?.toFixed(2)}</p>` : ''}
          <p class="total"><strong>Total:</strong> ₹${bill.totalAmount?.toFixed(2) || '0.00'}</p>
          <p><strong>Paid:</strong> ₹${bill.paidAmount?.toFixed(2) || '0.00'}</p>
          <p><strong>Balance Due:</strong> ₹${bill.dueAmount?.toFixed(2) || '0.00'}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your visit!</p>
          <p>This is a computer generated invoice.</p>
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const onRecordPayment = (data) => {
    if (!selectedBill) return;
    paymentMutation.mutate({
      id: selectedBill.id,
      paymentData: {
        amount: parseFloat(data.amount),
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      },
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getBalanceDue = (bill) => {
    return bill.dueAmount || 0;
  };

  const hasActiveFilters = filters.status || filters.startDate || filters.endDate;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            <p className="text-gray-500 mt-1">
              Manage invoices and payments
            </p>
          </div>
          {canCreateBilling && (
            <Link
              to="/billing/new"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <FaPlus />
              New Bill
            </Link>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by bill number or patient name..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition ${
                showFilters || hasActiveFilters
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FaFilter />
              Date Filter
              {(filters.startDate || filters.endDate) && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Expanded Date Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                  >
                    <FaTimes />
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bills Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FaFileInvoice className="text-4xl mb-4" />
              <p className="font-medium">No bills found</p>
              <p className="text-sm mt-1">
                {searchQuery || hasActiveFilters
                  ? 'Try adjusting your search or filters'
                  : 'Create your first bill to get started'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Bill No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Amount
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
                    {bills.map((bill) => (
                      <tr
                        key={bill.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {bill.billNo || bill.id.slice(-8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {formatDate(bill.createdAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {bill.patient?.name || 'Unknown Patient'}
                            </p>
                            {bill.patient?.phone && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {bill.patient.phone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(bill.totalAmount)}
                            </p>
                            {bill.status !== 'paid' && getBalanceDue(bill) > 0 && (
                              <p className="text-xs text-red-600 mt-0.5">
                                Due: {formatCurrency(getBalanceDue(bill))}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              STATUS_COLORS[bill.paymentStatus?.toLowerCase()] || STATUS_COLORS.pending
                            }`}
                          >
                            {bill.paymentStatus?.toLowerCase() || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openViewModal(bill)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View"
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => handlePrint(bill)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                              title="Print"
                            >
                              <FaPrint />
                            </button>
                            {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                              <button
                                onClick={() => openPaymentModal(bill)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition"
                                title="Record Payment"
                              >
                                <FaMoneyBillWave className="text-xs" />
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> bills
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    <FaChevronLeft className="text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    <FaChevronRight className="text-gray-600" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedBill(null);
          reset();
        }}
        title="Record Payment"
        size="md"
      >
        {selectedBill && (
          <form onSubmit={handleSubmit(onRecordPayment)} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Bill Number</p>
                  <p className="font-medium text-gray-900">
                    {selectedBill.billNo || selectedBill.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Balance Due</p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(getBalanceDue(selectedBill))}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 1, message: 'Amount must be at least 1' },
                  max: {
                    value: getBalanceDue(selectedBill),
                    message: `Amount cannot exceed ${formatCurrency(getBalanceDue(selectedBill))}`,
                  },
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
                defaultValue={getBalanceDue(selectedBill)}
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                {...register('method', { required: 'Payment method is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select method</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="netbanking">Net Banking</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
              {errors.method && (
                <p className="text-red-500 text-sm mt-1">{errors.method.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference / Transaction ID
              </label>
              <input
                {...register('reference')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter reference number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional payment notes"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedBill(null);
                  reset();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Bill Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedBill(null);
        }}
        title="Bill Details"
        size="lg"
      >
        {selectedBill && (
          <div className="space-y-4">
            {/* Bill Header */}
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-500">Bill Number</p>
                <p className="font-bold text-lg text-gray-900">
                  {selectedBill.billNo || selectedBill.id.slice(-8).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">
                  {formatDate(selectedBill.createdAt)}
                </p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Patient</p>
              <p className="font-medium text-gray-900">
                {selectedBill.patient?.name || 'Unknown Patient'}
              </p>
              {selectedBill.patient?.phone && (
                <p className="text-sm text-gray-600">{selectedBill.patient.phone}</p>
              )}
              {selectedBill.doctor?.name && (
                <p className="text-sm text-gray-600 mt-1">Doctor: Dr. {selectedBill.doctor.name}</p>
              )}
            </div>

            {/* Items */}
            {selectedBill.items && selectedBill.items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600">Description</th>
                        <th className="px-4 py-2 text-center text-gray-600">Qty</th>
                        <th className="px-4 py-2 text-right text-gray-600">Price</th>
                        <th className="px-4 py-2 text-right text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBill.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-center text-gray-600">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              {selectedBill.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-red-600">-{formatCurrency(selectedBill.discount)}</span>
                </div>
              )}
              {selectedBill.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({selectedBill.tax}%)</span>
                  <span className="text-gray-600">
                    {formatCurrency(selectedBill.taxAmount || 0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total Amount</span>
                <span className="text-gray-900">{formatCurrency(selectedBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="text-green-600">
                  {formatCurrency(
                    selectedBill.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
                  )}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-gray-700">Balance Due</span>
                <span className={getBalanceDue(selectedBill) > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(getBalanceDue(selectedBill))}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => handlePrint(selectedBill)}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <FaPrint />
                Print
              </button>
              {canEditBilling && (
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    navigate(`/billing/${selectedBill.id}/edit`);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Edit
                </button>
              )}
              {selectedBill.status !== 'paid' && selectedBill.status !== 'cancelled' && (
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openPaymentModal(selectedBill);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <FaMoneyBillWave />
                  Record Payment
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

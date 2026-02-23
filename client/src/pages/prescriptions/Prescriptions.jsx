import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaEye,
  FaPrint,
  FaPaperPlane,
  FaChevronLeft,
  FaChevronRight,
  FaFilePrescription,
  FaWhatsapp,
  FaEnvelope,
} from 'react-icons/fa';
import { prescriptionService } from '../../services/prescriptionService';
import { useHasPerm } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function Prescriptions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const pageSize = 10;

  // Fetch prescriptions
  const { data: prescriptionsData, isLoading } = useQuery({
    queryKey: ['prescriptions', currentPage, pageSize, searchQuery],
    queryFn: () =>
      prescriptionService.getPrescriptions({
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
      }),
    placeholderData: (previousData) => previousData,
    // Auto-refresh every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });

  const prescriptions = prescriptionsData?.data || [];
  const totalPages = prescriptionsData?.pagination?.totalPages || 1;
  const totalCount = prescriptionsData?.pagination?.total || 0;

  // Send prescription mutation
  const sendMutation = useMutation({
    mutationFn: ({ id, method }) => prescriptionService.sendPrescription(id, method),
    onSuccess: (response) => {
      // If WhatsApp URL is returned, open it in a new tab
      if (response.whatsappUrl) {
        window.open(response.whatsappUrl, '_blank');
        toast.success('WhatsApp opened. Send the message to complete.');
      } else {
        toast.success('Prescription sent successfully');
      }
      setShowSendModal(false);
      setSelectedPrescription(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send prescription');
    },
  });

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleView = (prescription) => {
    navigate(`/prescriptions/${prescription.id}`);
  };

  const handlePrint = (prescription) => {
    // Navigate to detail page and trigger print from there
    navigate(`/prescriptions/${prescription.id}?print=true`);
  };

  const handleSendClick = (prescription) => {
    setSelectedPrescription(prescription);
    setShowSendModal(true);
  };

  const handleSend = (method) => {
    if (selectedPrescription) {
      sendMutation.mutate({ id: selectedPrescription.id, method });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const canCreate = useHasPerm('prescriptions:create', ['DOCTOR', 'ADMIN', 'SUPER_ADMIN']);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-gray-500 mt-1">View and manage patient prescriptions</p>
          </div>
          {canCreate && (
            <Link to="/prescriptions/new">
              <Button iconLeft={FaPlus}>New Prescription</Button>
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by patient name or prescription ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Prescriptions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Prescription ID
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Date
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Patient
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Diagnosis
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                    </tr>
                  ))
                ) : prescriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <FaFilePrescription className="text-4xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No prescriptions found</p>
                      {searchQuery && (
                        <p className="text-sm text-gray-400 mt-1">
                          Try adjusting your search term
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  prescriptions.map((prescription) => (
                    <tr
                      key={prescription.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-blue-600">
                          {prescription.prescriptionNo ||
                            `RX${String(prescription.id).padStart(5, '0')}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(prescription.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {prescription.patient?.name?.charAt(0) || 'P'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {prescription.patient?.name || 'Unknown Patient'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {prescription.patient?.patientId ||
                                (prescription.patient?.id &&
                                  `P${String(prescription.patient.id).padStart(5, '0')}`)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-700 truncate max-w-xs">
                          {prescription.diagnosis || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(prescription)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handlePrint(prescription)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Print"
                          >
                            <FaPrint />
                          </button>
                          <button
                            onClick={() => handleSendClick(prescription)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Send"
                          >
                            <FaPaperPlane />
                          </button>
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} prescriptions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <FaChevronLeft className="text-gray-600" />
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <FaChevronRight className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Send Modal */}
        <Modal
          isOpen={showSendModal}
          onClose={() => {
            setShowSendModal(false);
            setSelectedPrescription(null);
          }}
          title="Send Prescription"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              How would you like to send this prescription to the patient?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleSend('whatsapp')}
                disabled={sendMutation.isPending}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <FaWhatsapp className="text-green-600 text-lg" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">WhatsApp</p>
                  <p className="text-sm text-gray-500">
                    Send via WhatsApp to {selectedPrescription?.patient?.phone || 'patient'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleSend('email')}
                disabled={sendMutation.isPending}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaEnvelope className="text-blue-600 text-lg" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-500">
                    Send via email to {selectedPrescription?.patient?.email || 'patient'}
                  </p>
                </div>
              </button>
            </div>

            {sendMutation.isPending && (
              <p className="text-center text-sm text-gray-500">Sending...</p>
            )}

            {sendMutation.isError && (
              <p className="text-center text-sm text-red-600">
                Failed to send. Please try again.
              </p>
            )}

            {sendMutation.isSuccess && (
              <p className="text-center text-sm text-green-600">
                Prescription sent successfully!
              </p>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

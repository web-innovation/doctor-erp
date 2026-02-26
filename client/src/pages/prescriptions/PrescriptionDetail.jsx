import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaPrint,
  FaPaperPlane,
  FaWhatsapp,
  FaEnvelope,
  FaPills,
  FaFlask,
  FaUser,
  FaCalendar,
  FaStethoscope,
  FaNotesMedical,
  FaHeartbeat,
  FaUpload,
  FaSpinner,
} from 'react-icons/fa';
import { prescriptionService } from '../../services/prescriptionService';
import settingsService from '../../services/settingsService';
import Modal from '../../components/common/Modal';
import { renderPrescriptionPrintHtml } from '../../utils/printTemplates';

export default function PrescriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSendModal, setShowSendModal] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('OTHER');
  const [docNotes, setDocNotes] = useState('');

  // Fetch prescription details
  const { data: prescriptionData, isLoading, error } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => prescriptionService.getPrescription(id),
    enabled: !!id,
  });
  const { data: clinicSettings } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: () => settingsService.getClinicSettings(),
  });
  const { data: printTemplateConfig } = useQuery({
    queryKey: ['print-templates'],
    queryFn: () => settingsService.getPrintTemplates(),
  });

  const prescription = prescriptionData?.data;
  const prescriptionDocuments = Array.isArray(prescription?.documents) ? prescription.documents : [];

  const uploadDocumentMutation = useMutation({
    mutationFn: (payload) => prescriptionService.uploadDocument(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescription', id] });
      toast.success('Document uploaded');
      setDocFile(null);
      setDocTitle('');
      setDocCategory('OTHER');
      setDocNotes('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    },
  });

  // Helper function to build vitals HTML
  const buildVitalsHtml = (vitals) => {
    if (!vitals || Object.keys(vitals).length === 0) return '';
    
    let vitalsItems = '';
    if (vitals.bp) vitalsItems += `<div class="vital-item"><div class="value">${vitals.bp}</div><div class="label">BP (mmHg)</div></div>`;
    if (vitals.pulse) vitalsItems += `<div class="vital-item"><div class="value">${vitals.pulse}</div><div class="label">Pulse (bpm)</div></div>`;
    if (vitals.temp) vitalsItems += `<div class="vital-item"><div class="value">${vitals.temp}</div><div class="label">Temp (°F)</div></div>`;
    if (vitals.spo2) vitalsItems += `<div class="vital-item"><div class="value">${vitals.spo2}%</div><div class="label">SpO2</div></div>`;
    if (vitals.weight) vitalsItems += `<div class="vital-item"><div class="value">${vitals.weight}</div><div class="label">Weight (kg)</div></div>`;

    return `
      <div class="vitals-section">
        <h3>Vitals</h3>
        <div class="vitals-grid">${vitalsItems}</div>
      </div>
    `;
  };

  // Helper function to build diagnosis HTML
  const buildDiagnosisHtml = (diagnosis) => {
    if (!Array.isArray(diagnosis) || diagnosis.length === 0) return '';
    const tags = diagnosis.map(d => `<span class="diagnosis-tag">${d}</span>`).join('');
    return `
      <div class="section">
        <div class="section-title">Diagnosis</div>
        <div class="diagnosis-tags">${tags}</div>
      </div>
    `;
  };

  // Helper function to build medicines HTML
  const buildMedicinesHtml = (medicines) => {
    if (!medicines || medicines.length === 0) return '';
    const rows = medicines.map((med, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="medicine-name">${med.medicineName}</div>
          ${med.genericName ? `<div class="generic-name">${med.genericName}</div>` : ''}
        </td>
        <td>${med.dosage || '-'}</td>
        <td>${med.frequency || '-'}</td>
        <td>${med.duration || '-'}</td>
        <td>${med.timing || '-'}</td>
      </tr>
    `).join('');

    return `
      <div class="section">
        <div class="section-title">℞ Medicines</div>
        <table>
          <thead>
            <tr>
              <th style="width:5%">#</th>
              <th style="width:30%">Medicine</th>
              <th style="width:15%">Dosage</th>
              <th style="width:15%">Frequency</th>
              <th style="width:15%">Duration</th>
              <th style="width:20%">Timing</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  // Helper function to build lab tests HTML
  const buildLabTestsHtml = (labTests) => {
    if (!labTests || labTests.length === 0) return '';
    const items = labTests.map((test, i) => `
      <div class="lab-test-item">
        <div class="lab-test-name">${i + 1}. ${test.testName}</div>
        ${test.instructions ? `<div class="lab-instructions">${test.instructions}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="section">
        <div class="section-title">Lab Tests</div>
        <div class="lab-tests">${items}</div>
      </div>
    `;
  };

  const handlePrint = () => {
    if (!prescription) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const html = renderPrescriptionPrintHtml(
      prescription,
      clinicSettings || {},
      printTemplateConfig || {}
    );

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };
  const handleSend = async (method) => {
    try {
      const response = await prescriptionService.sendPrescription(id, method);
      
      // If WhatsApp URL is returned, open it in a new tab
      if (response.whatsappUrl) {
        window.open(response.whatsappUrl, '_blank');
        toast.success('WhatsApp opened. Send the message to complete.');
      } else {
        toast.success(`Prescription sent via ${method}`);
      }
      setShowSendModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send prescription');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const submitDocument = () => {
    if (!docFile) {
      toast.error('Please select a file');
      return;
    }
    uploadDocumentMutation.mutate({
      file: docFile,
      title: docTitle,
      category: docCategory,
      notes: docNotes,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-red-600 mb-4">Failed to load prescription</p>
          <button
            onClick={() => navigate('/prescriptions')}
            className="text-blue-600 hover:underline"
          >
            Back to Prescriptions
          </button>
        </div>
      </div>
    );
  }

  const vitals = prescription.vitalsSnapshot || {};
  const diagnosis = Array.isArray(prescription.diagnosis) ? prescription.diagnosis : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/prescriptions')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <FaArrowLeft className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {prescription.prescriptionNo || `RX${String(prescription.id).padStart(5, '0')}`}
              </h1>
              <p className="text-gray-500 mt-1">{formatDate(prescription.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FaPrint />
              Print
            </button>
            <button
              onClick={() => setShowSendModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FaPaperPlane />
              Send
            </button>
          </div>
        </div>

        {/* Prescription Content */}
        <div id="prescription-print-area" className="space-y-6">
          {/* Patient Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <FaUser />
              <h2 className="text-lg font-semibold">Patient Information</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{prescription.patient?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Patient ID</p>
                <p className="font-medium">{prescription.patient?.patientId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{prescription.patient?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDate(prescription.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Vitals Card */}
          {(vitals.bp || vitals.pulse || vitals.temp || vitals.spo2 || vitals.weight) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <FaHeartbeat />
                <h2 className="text-lg font-semibold">Vitals</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {vitals.bp && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Blood Pressure</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals.bp}</p>
                  </div>
                )}
                {vitals.pulse && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Pulse</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals.pulse} bpm</p>
                  </div>
                )}
                {vitals.temp && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Temperature</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals.temp}°F</p>
                  </div>
                )}
                {vitals.spo2 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">SpO2</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals.spo2}%</p>
                  </div>
                )}
                {vitals.weight && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Weight</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals.weight} kg</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Diagnosis Card */}
          {(diagnosis.length > 0 || prescription.clinicalNotes) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 text-purple-600 mb-4">
                <FaStethoscope />
                <h2 className="text-lg font-semibold">Diagnosis & Notes</h2>
              </div>
              {diagnosis.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Diagnosis</p>
                  <div className="flex flex-wrap gap-2">
                    {diagnosis.map((d, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {prescription.clinicalNotes && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Clinical Notes</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{prescription.clinicalNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Medicines Card */}
          {prescription.medicines && prescription.medicines.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <FaPills />
                <h2 className="text-lg font-semibold">Medicines</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">#</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Medicine</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Dosage</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Frequency</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Duration</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Timing</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fulfillment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescription.medicines.map((med, index) => (
                      <tr key={med.id} className="border-b border-gray-50">
                        <td className="py-3 px-4 text-gray-500">{index + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{med.medicineName}</p>
                          {med.genericName && (
                            <p className="text-sm text-gray-500">{med.genericName}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{med.dosage || '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{med.frequency || '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{med.duration || '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{med.timing || '-'}</td>
                        <td className="py-3 px-4">
                          {med.isExternal ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                              External Purchase
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                              In-house
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lab Tests Card */}
          {prescription.labTests && prescription.labTests.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 text-orange-600 mb-4">
                <FaFlask />
                <h2 className="text-lg font-semibold">Lab Tests</h2>
              </div>
              <div className="space-y-3">
                {prescription.labTests.map((test, index) => (
                  <div key={test.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{test.testName}</p>
                      {test.instructions && (
                        <p className="text-sm text-gray-500">{test.instructions}</p>
                      )}
                      {test.lab?.name && (
                        <p className="text-sm text-blue-600">Lab: {test.lab.name}</p>
                      )}
                      <div className="mt-1">
                        {test.isExternal ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                            External Lab
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                            In-house Lab
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 text-indigo-600 mb-4">
              <FaNotesMedical />
              <h2 className="text-lg font-semibold">Supporting Documents</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <input
                type="file"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="LAB_REPORT">Lab Report</option>
                <option value="ULTRASOUND">Ultrasound</option>
                <option value="PRESCRIPTION">Prescription</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                type="text"
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={submitDocument}
                disabled={uploadDocumentMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {uploadDocumentMutation.isPending ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                Upload
              </button>
            </div>
            {prescriptionDocuments.length > 0 ? (
              <div className="space-y-2">
                {prescriptionDocuments.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.accessUrl || doc.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">{doc.title || doc.fileName}</p>
                    <p className="text-sm text-gray-500">{doc.category || 'OTHER'} � {formatDate(doc.uploadedAt)}</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No documents uploaded for this prescription.</p>
            )}
          </div>
          {/* Advice Card */}
          {prescription.advice && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <FaNotesMedical />
                <h2 className="text-lg font-semibold">Advice</h2>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{prescription.advice}</p>
            </div>
          )}

          {/* Follow-up Card */}
          {prescription.followUpDate && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 text-teal-600 mb-4">
                <FaCalendar />
                <h2 className="text-lg font-semibold">Follow-up</h2>
              </div>
              <p className="text-gray-700">
                Next visit scheduled for: <span className="font-medium">{formatDate(prescription.followUpDate)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Send Modal */}
        <Modal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
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
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <FaWhatsapp className="text-green-600 text-lg" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">WhatsApp</p>
                  <p className="text-sm text-gray-500">
                    Send via WhatsApp to {prescription.patient?.phone || 'patient'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleSend('email')}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaEnvelope className="text-blue-600 text-lg" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-500">
                    Send via email to {prescription.patient?.email || 'patient'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}



import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
} from 'react-icons/fa';
import { prescriptionService } from '../../services/prescriptionService';
import Modal from '../../components/common/Modal';

export default function PrescriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showSendModal, setShowSendModal] = useState(false);

  // Fetch prescription details
  const { data: prescriptionData, isLoading, error } = useQuery({
    queryKey: ['prescription', id],
    queryFn: () => prescriptionService.getPrescription(id),
    enabled: !!id,
  });

  const prescription = prescriptionData?.data;

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
    const prescNo = prescription.prescriptionNo || 'RX' + String(prescription.id).padStart(5, '0');
    const dateStr = new Date(prescription.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const patientName = prescription.patient?.name || 'N/A';
    const patientId = prescription.patient?.patientId || 'P' + String(prescription.patient?.id).padStart(5, '0');
    const phone = prescription.patient?.phone || 'N/A';
    
    const vitalsHtml = buildVitalsHtml(prescription.vitalsSnapshot);
    const diagnosisHtml = buildDiagnosisHtml(prescription.diagnosis);
    const medicinesHtml = buildMedicinesHtml(prescription.medicines);
    const labTestsHtml = buildLabTestsHtml(prescription.labTests);
    const notesHtml = prescription.clinicalNotes ? `
      <div class="section">
        <div class="section-title">Clinical Notes</div>
        <div class="notes-box"><p>${prescription.clinicalNotes}</p></div>
      </div>
    ` : '';
    const adviceHtml = prescription.advice ? `
      <div class="section">
        <div class="section-title">Advice</div>
        <div class="advice-box"><p>${prescription.advice}</p></div>
      </div>
    ` : '';
    const followupHtml = prescription.followUpDate ? `
      <div class="followup">
        <div class="followup-label">Follow-up Date</div>
        <div class="followup-date">${new Date(prescription.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>
    ` : '<div></div>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription - ${prescNo}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 30px; 
              max-width: 800px; 
              margin: 0 auto;
              color: #333;
              line-height: 1.5;
            }
            .prescription-container {
              border: 2px solid #2563eb;
              border-radius: 8px;
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white;
              padding: 20px 30px;
              text-align: center;
            }
            .clinic-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
            .clinic-info { font-size: 12px; opacity: 0.9; }
            .content { padding: 25px 30px; position: relative; }
            .prescription-no { text-align: right; font-size: 14px; color: #666; margin-bottom: 15px; }
            .patient-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .patient-card h3 {
              color: #2563eb;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .patient-details {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
            }
            .detail-item label { font-size: 11px; color: #64748b; display: block; }
            .detail-item span { font-size: 14px; font-weight: 600; color: #1e293b; }
            .vitals-section {
              background: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
            }
            .vitals-section h3 {
              color: #b45309;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .vitals-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
            }
            .vital-item {
              background: white;
              padding: 10px;
              border-radius: 6px;
              text-align: center;
            }
            .vital-item .value { font-size: 18px; font-weight: bold; color: #b45309; }
            .vital-item .label { font-size: 10px; color: #666; text-transform: uppercase; }
            .section { margin-bottom: 20px; }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #2563eb;
              text-transform: uppercase;
              letter-spacing: 1px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
              margin-bottom: 15px;
            }
            .diagnosis-tags { display: flex; flex-wrap: wrap; gap: 8px; }
            .diagnosis-tag {
              background: #dbeafe;
              color: #1e40af;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 500;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { 
              background: #f1f5f9;
              color: #475569;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
              padding: 12px 10px;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
            tr:last-child td { border-bottom: none; }
            .medicine-name { font-weight: 600; color: #1e293b; }
            .generic-name { font-size: 11px; color: #64748b; font-style: italic; }
            .lab-tests { display: grid; gap: 10px; }
            .lab-test-item {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 10px 15px;
              border-radius: 0 6px 6px 0;
            }
            .lab-test-name { font-weight: 600; color: #92400e; }
            .lab-instructions { font-size: 12px; color: #78350f; }
            .advice-box {
              background: #ecfdf5;
              border: 1px solid #10b981;
              border-radius: 8px;
              padding: 15px;
            }
            .advice-box p { color: #065f46; white-space: pre-wrap; }
            .notes-box {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 15px;
            }
            .notes-box p { color: #475569; white-space: pre-wrap; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px dashed #cbd5e1;
              display: flex;
              justify-content: space-between;
            }
            .followup { background: #dbeafe; padding: 10px 15px; border-radius: 6px; }
            .followup-label { font-size: 11px; color: #3b82f6; text-transform: uppercase; }
            .followup-date { font-weight: bold; color: #1e40af; }
            .signature { text-align: right; }
            .signature-line { border-top: 1px solid #333; width: 200px; margin-left: auto; margin-bottom: 5px; }
            .doctor-name { font-weight: bold; }
            @media print { 
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .prescription-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="prescription-container">
            <div class="header">
              <div class="clinic-name">Docsy ERP</div>
              <div class="clinic-info">Your Trusted Healthcare Partner | Phone: +91 9876543210</div>
            </div>
            <div class="content">
              <div class="prescription-no">
                <strong>${prescNo}</strong>&nbsp;|&nbsp;${dateStr}
              </div>
              
              <div class="patient-card">
                <h3>Patient Information</h3>
                <div class="patient-details">
                  <div class="detail-item"><label>Name</label><span>${patientName}</span></div>
                  <div class="detail-item"><label>Patient ID</label><span>${patientId}</span></div>
                  <div class="detail-item"><label>Phone</label><span>${phone}</span></div>
                  <div class="detail-item"><label>Date</label><span>${new Date(prescription.createdAt).toLocaleDateString('en-IN')}</span></div>
                </div>
              </div>

              ${vitalsHtml}
              ${diagnosisHtml}
              ${notesHtml}
              ${medicinesHtml}
              ${labTestsHtml}
              ${adviceHtml}

              <div class="footer">
                ${followupHtml}
                <div class="signature">
                  <div class="signature-line"></div>
                  <div class="doctor-name">Doctor's Signature</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
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
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
                <p className="font-medium">{prescription.patient?.patientId || `P${String(prescription.patient?.id).padStart(5, '0')}`}</p>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

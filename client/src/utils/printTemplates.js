const DEFAULT_PRINT_TEMPLATES = {
  billTemplateId: 'classic',
  prescriptionTemplateId: 'modern',
  customBillHtml: '',
  customPrescriptionHtml: '',
};

export const BILL_TEMPLATE_OPTIONS = [
  { value: 'classic', label: 'Classic Invoice' },
  { value: 'modern', label: 'Modern Card' },
  { value: 'compact', label: 'Compact Minimal' },
  { value: 'custom', label: 'Custom HTML' },
];

export const PRESCRIPTION_TEMPLATE_OPTIONS = [
  { value: 'modern', label: 'Modern Clinical' },
  { value: 'classic', label: 'Classic Doctor Pad' },
  { value: 'compact', label: 'Compact Sheet' },
  { value: 'custom', label: 'Custom HTML' },
];

export function normalizePrintTemplateConfig(config) {
  const src = config && typeof config === 'object' ? config : {};
  return {
    billTemplateId: String(src.billTemplateId || DEFAULT_PRINT_TEMPLATES.billTemplateId),
    prescriptionTemplateId: String(src.prescriptionTemplateId || DEFAULT_PRINT_TEMPLATES.prescriptionTemplateId),
    customBillHtml: String(src.customBillHtml || ''),
    customPrescriptionHtml: String(src.customPrescriptionHtml || ''),
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value) {
  const n = Number(value || 0);
  return `INR ${n.toFixed(2)}`;
}

function sanitizeCustomTemplate(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*\"[^\"]*\"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .trim();
}

function replacePlaceholders(template, map) {
  return Object.entries(map).reduce((acc, [key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return acc.replace(token, String(value ?? ''));
  }, template);
}

function ensureHtmlDocument(html, title) {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>${escapeHtml(title || 'Print')}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}h1,h2,h3{margin:0 0 10px}</style></head><body>${html}</body></html>`;
}

function buildBillMap(bill, clinic = {}) {
  const items = Array.isArray(bill?.items) ? bill.items : [];
  const rows = items.map((item, idx) => {
    const qty = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unitPrice || 0);
    const line = qty * unitPrice;
    return `<tr><td>${idx + 1}</td><td>${escapeHtml(item?.description || '')}</td><td style=\"text-align:center\">${qty}</td><td style=\"text-align:right\">${formatCurrency(unitPrice)}</td><td style=\"text-align:right\">${formatCurrency(line)}</td></tr>`;
  }).join('');

  return {
    clinicName: escapeHtml(clinic?.clinicName || 'Clinic'),
    clinicPhone: escapeHtml(clinic?.phone || ''),
    clinicAddress: escapeHtml(clinic?.address || ''),
    billNo: escapeHtml(bill?.billNo || bill?.id || '-'),
    billDate: escapeHtml(formatDate(bill?.createdAt)),
    patientName: escapeHtml(bill?.patient?.name || '-'),
    patientPhone: escapeHtml(bill?.patient?.phone || '-'),
    doctorName: escapeHtml(bill?.doctor?.name || '-'),
    paymentStatus: escapeHtml(String(bill?.paymentStatus || 'PENDING')),
    itemsTableRows: rows,
    subtotal: escapeHtml(formatCurrency(bill?.subtotal || 0)),
    discount: escapeHtml(formatCurrency(bill?.discountAmount || 0)),
    tax: escapeHtml(formatCurrency(bill?.taxAmount || 0)),
    total: escapeHtml(formatCurrency(bill?.totalAmount || 0)),
    paid: escapeHtml(formatCurrency(bill?.paidAmount || 0)),
    due: escapeHtml(formatCurrency(bill?.dueAmount || 0)),
    notes: escapeHtml(bill?.notes || ''),
  };
}

function buildPrescriptionMap(prescription, clinic = {}) {
  const medicines = Array.isArray(prescription?.medicines) ? prescription.medicines : [];
  const medicineRows = medicines.map((med, idx) => (
    `<tr><td>${idx + 1}</td><td>${escapeHtml(med?.medicineName || '-')}</td><td>${escapeHtml(med?.dosage || '-')}</td><td>${escapeHtml(med?.frequency || '-')}</td><td>${escapeHtml(med?.duration || '-')}</td><td>${escapeHtml(med?.timing || '-')}</td></tr>`
  )).join('');

  const diagnosis = Array.isArray(prescription?.diagnosis) ? prescription.diagnosis : [];
  const diagnosisList = diagnosis.length ? `<ul>${diagnosis.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>` : '<div>-</div>';

  const labTests = Array.isArray(prescription?.labTests) ? prescription.labTests : [];
  const labTestsList = labTests.length
    ? `<ul>${labTests.map((t) => `<li>${escapeHtml(t?.testName || '')}${t?.instructions ? ` - ${escapeHtml(t.instructions)}` : ''}</li>`).join('')}</ul>`
    : '<div>-</div>';

  const vitals = prescription?.vitalsSnapshot || {};
  const vitalsList = Object.entries(vitals)
    .filter(([, v]) => v !== null && v !== undefined && String(v) !== '')
    .map(([k, v]) => `<li>${escapeHtml(k)}: ${escapeHtml(v)}</li>`)
    .join('') || '<li>-</li>';

  return {
    clinicName: escapeHtml(clinic?.clinicName || 'Clinic'),
    clinicPhone: escapeHtml(clinic?.phone || ''),
    clinicAddress: escapeHtml(clinic?.address || ''),
    prescriptionNo: escapeHtml(prescription?.prescriptionNo || prescription?.id || '-'),
    prescriptionDate: escapeHtml(formatDate(prescription?.createdAt)),
    patientName: escapeHtml(prescription?.patient?.name || '-'),
    patientId: escapeHtml(prescription?.patient?.patientId || '-'),
    patientPhone: escapeHtml(prescription?.patient?.phone || '-'),
    doctorName: escapeHtml(prescription?.doctor?.name || '-'),
    diagnosisList,
    medicinesTableRows: medicineRows,
    labTestsList,
    clinicalNotes: escapeHtml(prescription?.clinicalNotes || '-'),
    advice: escapeHtml(prescription?.advice || '-'),
    followUpDate: escapeHtml(formatDate(prescription?.followUpDate)),
    vitalsList: `<ul>${vitalsList}</ul>`,
  };
}

function billClassicTemplate(data) {
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>Bill ${data.billNo}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1f2937}.h{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}.m{margin:6px 0}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #d1d5db;padding:8px}th{background:#f3f4f6;text-align:left}.right{text-align:right}.totals{margin-top:12px;margin-left:auto;max-width:360px}.totals .r{display:flex;justify-content:space-between;padding:3px 0}.totals .t{font-weight:700;border-top:1px solid #111;padding-top:8px}small{color:#6b7280}</style></head><body><div class=\"h\"><div><h2 style=\"margin:0\">${data.clinicName}</h2><div class=\"m\">${data.clinicAddress}</div><div class=\"m\">${data.clinicPhone}</div></div><div><div><strong>Bill:</strong> ${data.billNo}</div><div><strong>Date:</strong> ${data.billDate}</div><div><strong>Status:</strong> ${data.paymentStatus}</div></div></div><div><strong>Patient:</strong> ${data.patientName}<br><strong>Phone:</strong> ${data.patientPhone}<br><strong>Doctor:</strong> ${data.doctorName}</div><table><thead><tr><th>#</th><th>Description</th><th style=\"text-align:center\">Qty</th><th class=\"right\">Price</th><th class=\"right\">Amount</th></tr></thead><tbody>${data.itemsTableRows}</tbody></table><div class=\"totals\"><div class=\"r\"><span>Subtotal</span><span>${data.subtotal}</span></div><div class=\"r\"><span>Discount</span><span>${data.discount}</span></div><div class=\"r\"><span>Tax</span><span>${data.tax}</span></div><div class=\"r t\"><span>Total</span><span>${data.total}</span></div><div class=\"r\"><span>Paid</span><span>${data.paid}</span></div><div class=\"r\"><span>Due</span><span>${data.due}</span></div></div><p><small>${data.notes}</small></p></body></html>`;
}

function billModernTemplate(data) {
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>Bill ${data.billNo}</title><style>body{font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:20px}.card{max-width:900px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.top{background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;padding:18px 22px;display:flex;justify-content:space-between}.body{padding:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:10px;border-bottom:1px solid #e2e8f0}th{font-size:12px;text-transform:uppercase;color:#64748b;text-align:left}.r{text-align:right}</style></head><body><div class=\"card\"><div class=\"top\"><div><h2 style=\"margin:0\">${data.clinicName}</h2><div>${data.clinicAddress}</div></div><div style=\"text-align:right\"><div><strong>${data.billNo}</strong></div><div>${data.billDate}</div><div>${data.paymentStatus}</div></div></div><div class=\"body\"><div class=\"grid\"><div class=\"box\"><strong>Patient</strong><div>${data.patientName}</div><div>${data.patientPhone}</div></div><div class=\"box\"><strong>Doctor</strong><div>${data.doctorName}</div></div><div class=\"box\"><strong>Contact</strong><div>${data.clinicPhone}</div></div></div><table><thead><tr><th>#</th><th>Description</th><th style=\"text-align:center\">Qty</th><th class=\"r\">Price</th><th class=\"r\">Amount</th></tr></thead><tbody>${data.itemsTableRows}</tbody></table><div style=\"display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:14px\"><div></div><div><div>Subtotal: ${data.subtotal}</div><div>Discount: ${data.discount}</div><div>Tax: ${data.tax}</div><div style=\"font-weight:700\">Total: ${data.total}</div><div>Paid: ${data.paid}</div><div>Due: ${data.due}</div></div></div></div></div></body></html>`;
}

function billCompactTemplate(data) {
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>Bill ${data.billNo}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:12px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px}.r{text-align:right}</style></head><body><h3 style=\"margin:0\">${data.clinicName}</h3><div>${data.clinicAddress} | ${data.clinicPhone}</div><hr><div>Bill ${data.billNo} | ${data.billDate} | ${data.paymentStatus}</div><div>Patient: ${data.patientName} (${data.patientPhone}) | Doctor: ${data.doctorName}</div><table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th class=\"r\">Price</th><th class=\"r\">Amt</th></tr></thead><tbody>${data.itemsTableRows}</tbody></table><div style=\"text-align:right;margin-top:8px\">Total ${data.total} | Paid ${data.paid} | Due ${data.due}</div></body></html>`;
}

function prescriptionModernTemplate(data) {
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>Prescription ${data.prescriptionNo}</title><style>body{font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:18px;color:#0f172a}.card{max-width:900px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}.top{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:16px 20px;display:flex;justify-content:space-between}.body{padding:20px}.sec{margin-bottom:14px}.sec h4{margin:0 0 8px 0;color:#1d4ed8}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}th{font-size:12px;color:#64748b;text-transform:uppercase}</style></head><body><div class=\"card\"><div class=\"top\"><div><h2 style=\"margin:0\">${data.clinicName}</h2><div>${data.clinicAddress}</div><div>${data.clinicPhone}</div></div><div style=\"text-align:right\"><div><strong>${data.prescriptionNo}</strong></div><div>${data.prescriptionDate}</div></div></div><div class=\"body\"><div class=\"sec\"><strong>Patient:</strong> ${data.patientName} (${data.patientId}) | ${data.patientPhone}<br><strong>Doctor:</strong> ${data.doctorName}</div><div class=\"sec\"><h4>Vitals</h4>${data.vitalsList}</div><div class=\"sec\"><h4>Diagnosis</h4>${data.diagnosisList}</div><div class=\"sec\"><h4>Medicines</h4><table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Timing</th></tr></thead><tbody>${data.medicinesTableRows}</tbody></table></div><div class=\"sec\"><h4>Lab Tests</h4>${data.labTestsList}</div><div class=\"sec\"><h4>Clinical Notes</h4><div>${data.clinicalNotes}</div></div><div class=\"sec\"><h4>Advice</h4><div>${data.advice}</div></div><div class=\"sec\"><strong>Follow-up:</strong> ${data.followUpDate}</div></div></div></body></html>`;
}

function prescriptionClassicTemplate(data) {
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>Prescription ${data.prescriptionNo}</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:7px}h3,h4{margin:8px 0}</style></head><body><h3>${data.clinicName}</h3><div>${data.clinicAddress} | ${data.clinicPhone}</div><hr><div><strong>Rx:</strong> ${data.prescriptionNo} | <strong>Date:</strong> ${data.prescriptionDate}</div><div><strong>Patient:</strong> ${data.patientName} (${data.patientId}) | ${data.patientPhone}</div><div><strong>Doctor:</strong> ${data.doctorName}</div><h4>Diagnosis</h4>${data.diagnosisList}<h4>Medicines</h4><table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Timing</th></tr></thead><tbody>${data.medicinesTableRows}</tbody></table><h4>Lab Tests</h4>${data.labTestsList}<h4>Advice</h4><div>${data.advice}</div></body></html>`;
}

function prescriptionCompactTemplate(data) {
  return `<!doctype html><html><head><meta charset=\"utf-8\"><title>Prescription ${data.prescriptionNo}</title><style>body{font-family:Arial,sans-serif;font-size:12px;padding:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px}</style></head><body><strong>${data.clinicName}</strong><br>${data.prescriptionNo} | ${data.prescriptionDate}<hr>Patient: ${data.patientName} (${data.patientId})<br>Doctor: ${data.doctorName}<br><br>Medicines:<table><thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Freq</th><th>Duration</th><th>Timing</th></tr></thead><tbody>${data.medicinesTableRows}</tbody></table><div style=\"margin-top:8px\">Advice: ${data.advice}</div></body></html>`;
}

export function renderBillPrintHtml(bill, clinic, templateConfig) {
  const cfg = normalizePrintTemplateConfig(templateConfig);
  const data = buildBillMap(bill, clinic);

  if (cfg.billTemplateId === 'custom' && cfg.customBillHtml) {
    const custom = sanitizeCustomTemplate(cfg.customBillHtml);
    return ensureHtmlDocument(replacePlaceholders(custom, data), `Bill ${data.billNo}`);
  }
  if (cfg.billTemplateId === 'modern') return billModernTemplate(data);
  if (cfg.billTemplateId === 'compact') return billCompactTemplate(data);
  return billClassicTemplate(data);
}

export function renderPrescriptionPrintHtml(prescription, clinic, templateConfig) {
  const cfg = normalizePrintTemplateConfig(templateConfig);
  const data = buildPrescriptionMap(prescription, clinic);

  if (cfg.prescriptionTemplateId === 'custom' && cfg.customPrescriptionHtml) {
    const custom = sanitizeCustomTemplate(cfg.customPrescriptionHtml);
    return ensureHtmlDocument(replacePlaceholders(custom, data), `Prescription ${data.prescriptionNo}`);
  }
  if (cfg.prescriptionTemplateId === 'classic') return prescriptionClassicTemplate(data);
  if (cfg.prescriptionTemplateId === 'compact') return prescriptionCompactTemplate(data);
  return prescriptionModernTemplate(data);
}

export const PRINT_TEMPLATE_PLACEHOLDERS = {
  bill: [
    '{{clinicName}}', '{{clinicPhone}}', '{{clinicAddress}}', '{{billNo}}', '{{billDate}}',
    '{{patientName}}', '{{patientPhone}}', '{{doctorName}}', '{{paymentStatus}}', '{{itemsTableRows}}',
    '{{subtotal}}', '{{discount}}', '{{tax}}', '{{total}}', '{{paid}}', '{{due}}', '{{notes}}',
  ],
  prescription: [
    '{{clinicName}}', '{{clinicPhone}}', '{{clinicAddress}}', '{{prescriptionNo}}', '{{prescriptionDate}}',
    '{{patientName}}', '{{patientId}}', '{{patientPhone}}', '{{doctorName}}', '{{vitalsList}}',
    '{{diagnosisList}}', '{{medicinesTableRows}}', '{{labTestsList}}', '{{clinicalNotes}}', '{{advice}}', '{{followUpDate}}',
  ],
};

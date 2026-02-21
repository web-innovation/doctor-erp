import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { purchaseService } from '../../services/purchaseService';
import { pharmacyService } from '../../services/pharmacyService';
import appNotificationService from '../../services/appNotificationService';

export default function UploadPurchase() {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [supplierExists, setSupplierExists] = useState(true);
  const [supplierCandidate, setSupplierCandidate] = useState(null);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [supplierSearching, setSupplierSearching] = useState(false);
  const [createSupplierMutState, setCreateSupplierMutState] = useState({});
  const [createProductLoading, setCreateProductLoading] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [createProductForm, setCreateProductForm] = useState({ name: '', code: '', category: '', mrp: 0, purchasePrice: 0, sellingPrice: 0, gstPercent: 12, quantity: 0, unit: 'pcs', expiryDate: '', manufacturer: '' });
  const [creatingProductRow, setCreatingProductRow] = useState(null);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [createSupplierForm, setCreateSupplierForm] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '', notes: '' });
  const [productOptions, setProductOptions] = useState({});
  const [productSearching, setProductSearching] = useState({});
  const searchTimeouts = useRef({});
  const [items, setItems] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [createAndReceiveFlag, setCreateAndReceiveFlag] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef(null);
  const pollingRef = useRef({ intervalId: null, timeoutId: null });
  const notifiedUploadIdsRef = useRef(new Set());

  const uploadMut = useMutation({
    mutationFn: ({ form, signal }) => purchaseService.uploadInvoice(form, { signal, timeout: 300000 }),
    onSuccess: (res) => {
      const data = res?.data || res || {};
      const nested = data?.data || {};
      const uploadIdVal = data.id || nested.id || data.uploadId || nested.uploadId || null;
      setUploadId(uploadIdVal);
      const parsedRaw = data.parsedJson || nested.parsedJson || data.parsed || nested.parsed || null;
      let p = null;
      try {
        if (parsedRaw) {
          if (typeof parsedRaw === 'string') p = JSON.parse(parsedRaw);
          else p = parsedRaw;
        }
      } catch (e) {
        // fallback: try to parse top-level fields if available
        try { p = JSON.parse(JSON.stringify(parsedRaw)); } catch (ee) { p = null; }
      }
      setParsed(p);
      if (p) {
        setIsUploading(false);
      } else {
        toast.success('File uploaded. Parsing in background — waiting for results...');
        // start polling for parsed result
        if (uploadIdVal) startPollingUpload(uploadIdVal);
      }
    },
    onError: (err) => {
      // Prefer server-provided error details when available (e.g., parsing failure)
      const resp = err?.response;
      if (resp && resp.data) {
        const serverMsg = resp.data.message || resp.data.error || 'Upload failed';
        // If server included the upload record, show parsedJson preview if present
        const record = resp.data.data || resp.data.record || null;
        let p = null;
        try {
          if (record && record.parsedJson) {
            const raw = record.parsedJson;
            p = typeof raw === 'string' ? JSON.parse(raw) : raw;
            setUploadId(record.id || uploadId);
            setParsed(p);
            toast.error(`${serverMsg} — parsed preview available for review`);
            return;
          }
        } catch (e) {
          // ignore parse error of parsedJson
        }
        toast.error(serverMsg);
      } else {
        toast.error('Upload failed');
      }
    }
  });

  // Poll upload status until PARSED, FAILED, or timeout (5 minutes)
  const startPollingUpload = (id) => {
    // clear any existing
    stopPolling();
    setIsUploading(true);
    const start = Date.now();
    const intervalId = setInterval(async () => {
      try {
        const res = await purchaseService.getUpload(id);
        const u = res?.data || res;
        const record = u?.data || u;
        if (!record) return;
        const status = record.status;
        if (status === 'PARSED' && record.parsedJson) {
          let p = null;
          try { p = typeof record.parsedJson === 'string' ? JSON.parse(record.parsedJson) : record.parsedJson; } catch (e) { p = null; }
          setParsed(p);
          setUploadId(id);
          stopPolling();
          setIsUploading(false);
          return;
        }
        if (status === 'FAILED') {
          toast.error('Parsing failed on server');
          stopPolling();
          setIsUploading(false);
          return;
        }
        if (status === 'CANCELLED') {
          toast('Upload cancelled');
          stopPolling();
          setIsUploading(false);
          return;
        }
        // timeout after 5 minutes
        if (Date.now() - start > 300000) {
          toast.error('Parsing timed out after 5 minutes');
          stopPolling();
          setIsUploading(false);
          return;
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 3000);
    const timeoutId = setTimeout(() => {
      // safety stop
      stopPolling();
      setIsUploading(false);
    }, 300000 + 5000);
    pollingRef.current = { intervalId, timeoutId };
  };

  const stopPolling = () => {
    try {
      if (pollingRef.current.intervalId) clearInterval(pollingRef.current.intervalId);
      if (pollingRef.current.timeoutId) clearTimeout(pollingRef.current.timeoutId);
    } catch (e) {}
    pollingRef.current = { intervalId: null, timeoutId: null };
  };

  const createMut = useMutation({
    mutationFn: ({ id, body }) => purchaseService.createFromUpload(id, body),
    onSuccess: async (res, vars) => {
      const data = res?.data || res || {};
      const purchase = data || data?.data;
      toast.success('Purchase created from upload');
      // If user requested immediate receive/publish, call receive endpoint
      try {
        if (vars?.body?.createAndReceive) {
          const id = purchase.id || purchase?.data?.id || (data?.id);
          if (id) {
            await purchaseService.receivePurchase(id);
            toast.success('Purchase published and stock updated');
          }
        }
      } catch (err) {
        toast.error('Created purchase but failed to publish/receive');
      }
      // Navigate to purchases list for review
      window.location.href = '/pharmacy/purchases';
    },
    onError: () => toast.error('Failed to create purchase')
  });

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file');
    const fd = new FormData();
    fd.append('file', file);
    // setup abort controller to allow cancel
    if (abortControllerRef.current) { try { abortControllerRef.current.abort(); } catch (e) {} }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsUploading(true);
    uploadMut.mutate({ form: fd, signal: controller.signal }, {
      onSettled: () => { setIsUploading(false); abortControllerRef.current = null; }
    });
  };

  const handleCancelUpload = async () => {
    // abort in-flight request
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    } catch (e) { }
    setIsUploading(false);
    // if there is an upload record, ask server to cancel background parsing
    if (uploadId) {
      try {
        await purchaseService.cancelUpload(uploadId);
        toast.success('Upload cancelled');
      } catch (e) {
        toast.error('Failed to cancel upload on server');
      }
    } else {
      toast('Upload request aborted');
    }
  };

  const handleConfirm = async () => {
    if (!uploadId) return toast.error('No upload to confirm');
    const body = {
      supplierId: supplierId || null,
      createAndReceive: false,
      items,
      invoiceNo,
      invoiceDate,
      subtotal: Number(subtotal),
      taxAmount: Number(taxAmount),
      totalAmount: Number(totalAmount)
    };
    createMut.mutate({ id: uploadId, body });
  };

  useEffect(() => {
    if (parsed) {
      setItems((parsed.items && Array.isArray(parsed.items)) ? parsed.items.map((it) => ({
        name: it.name || it.description || 'Item',
        productId: it.productId || null,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        taxAmount: Number(it.taxAmount || 0),
        amount: Number(it.amount || ((it.quantity || 1) * (it.unitPrice || 0))),
        batchNumber: it.batchNumber || '',
        expiryDate: it.expiryDate ? (it.expiryDate.split ? it.expiryDate.split('T')[0] : it.expiryDate) : ''
      })) : []);
      setInvoiceNo(parsed.invoiceNo || '');
      setInvoiceDate(parsed.invoiceDate ? parsed.invoiceDate.split('T')[0] : '');
      setSubtotal(parsed.subtotal || parsed.totals?.sub_total || 0);
      // Prefer parsed.taxAmount; if missing but tax_summary present, sum sgst+cgst or use tax_amount
      let taxVal = parsed.taxAmount;
      if (!taxVal && Array.isArray(parsed.tax_summary) && parsed.tax_summary.length) {
        const t = parsed.tax_summary[0];
        taxVal = Number(t.tax_amount || (Number(t.sgst_amount || 0) + Number(t.cgst_amount || 0)) || 0);
      }
      setTaxAmount(taxVal || 0);
      setTotalAmount(parsed.totalAmount || parsed.totals?.net_amount || +(Number(parsed.subtotal || 0) + Number(taxVal || 0)).toFixed(2));

      // Supplier candidate detection: supplier must come from seller/pharmacy details only.
      const supplierName = parsed.pharmacy_details?.name || null;
      if (supplierName) {
        setSupplierCandidate({
          name: supplierName,
          phone: parsed.pharmacy_details?.phone || '',
          email: parsed.pharmacy_details?.email || '',
          address: parsed.pharmacy_details?.address || '',
          gstNumber: parsed.pharmacy_details?.gstin || ''
        });
        // quick check if supplier exists
        (async () => {
          try {
            const r = await purchaseService.getSuppliers(supplierName);
            const list = r?.data || r;
            if (Array.isArray(list) && list.length) {
              setSupplierExists(true);
            } else {
              setSupplierExists(false);
            }
          } catch (e) { setSupplierExists(false); }
        })();
      }
    } else {
      setItems([]);
      setInvoiceNo('');
      setInvoiceDate('');
      setSubtotal(0);
      setTaxAmount(0);
      setTotalAmount(0);
    }
  }, [parsed]);

  useEffect(() => {
    if (!parsed) return;
    const notifId = uploadId ? `draft-purchase-ready-${uploadId}` : `draft-purchase-ready-${Date.now()}`;
    if (notifiedUploadIdsRef.current.has(notifId)) return;
    notifiedUploadIdsRef.current.add(notifId);
    appNotificationService.add({
      id: notifId,
      title: 'Draft Purchase Ready',
      message: parsed?.invoiceNo ? `Invoice ${parsed.invoiceNo} is ready for review.` : 'A draft purchase is ready for review.',
      path: '/pharmacy/purchases',
      type: 'purchase',
      unread: true
    });
  }, [parsed, uploadId]);

  // Notify user when parsing completes and parsed data is available
  useEffect(() => {
    if (!parsed) return;
    toast.success((t) => (
      <div className="cursor-pointer" onClick={() => { window.location.href = '/pharmacy/purchases'; toast.dismiss(t.id); }}>
        Draft purchase ready for invoice — check the draft purchase list
      </div>
    ), { duration: 8000 });
  }, [parsed]);

  useEffect(() => {
    if (!supplierQuery || supplierQuery.length < 2) {
      setSupplierOptions([]);
      return;
    }
    setSupplierSearching(true);
    const t = setTimeout(() => {
      purchaseService.getSuppliers(supplierQuery).then((res) => {
        const data = res.data || res;
        setSupplierOptions(Array.isArray(data) ? data : []);
      }).catch(() => setSupplierOptions([])).finally(() => setSupplierSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [supplierQuery]);

  useEffect(() => {
    return () => {
      // cleanup polling and abort controller on unmount
      stopPolling();
      try { if (abortControllerRef.current) abortControllerRef.current.abort(); } catch (e) {}
    };
  }, []);

  const createSupplier = async (name) => {
    try {
      setCreateSupplierMutState({ loading: true });
      const res = await purchaseService.createSupplier({ name });
      const data = res.data || res;
      const s = data || data?.data;
      setSupplierId(s.id || s?.id);
      setSupplierQuery(s.name || name);
      setSupplierOptions([]);
      toast.success('Supplier created');
      setCreateSupplierMutState({ loading: false });
      return s;
    } catch (e) {
      setCreateSupplierMutState({ loading: false });
      toast.error('Failed to create supplier');
      throw e;
    }
  };

  const updateItem = (idx, key, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      // recalc amount
      const q = Number(copy[idx].quantity || 0);
      const up = Number(copy[idx].unitPrice || 0);
      copy[idx].amount = +(q * up).toFixed(2);
      // update totals
      const st = copy.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      setSubtotal(st);
      setTotalAmount(+(st + Number(taxAmount || 0)).toFixed(2));
      // trigger product search if user is editing name
      if (key === 'name') {
        const qStr = (value || '').toString();
        if (searchTimeouts.current[idx]) clearTimeout(searchTimeouts.current[idx]);
        if (qStr.length >= 2) {
          setProductSearching((p) => ({ ...p, [idx]: true }));
          searchTimeouts.current[idx] = setTimeout(async () => {
            try {
              const res = await pharmacyService.getProducts({ search: qStr, limit: 10 });
              const data = res.data || res;
              setProductOptions((p) => ({ ...p, [idx]: Array.isArray(data) ? data : [] }));
            } catch (e) {
              setProductOptions((p) => ({ ...p, [idx]: [] }));
            } finally {
              setProductSearching((p) => ({ ...p, [idx]: false }));
            }
          }, 300);
        } else {
          setProductOptions((p) => ({ ...p, [idx]: [] }));
          setProductSearching((p) => ({ ...p, [idx]: false }));
          if (searchTimeouts.current[idx]) { clearTimeout(searchTimeouts.current[idx]); delete searchTimeouts.current[idx]; }
        }
      }
      return copy;
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-lg font-medium mb-4">Upload Purchase Invoice</h2>
      <div className="mb-4">
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <div className="text-xs text-gray-600 mt-2">Note: Invoice scanning can take a few minutes. Please wait until parsing completes.</div>
      </div>
      <div className="flex gap-2">
        <div className="flex items-center gap-2">
          <Button onClick={handleUpload} loading={uploadMut.isLoading || isUploading}>Upload & Parse</Button>
          { (uploadMut.isLoading || isUploading) && (
            <button className="px-3 py-1 bg-red-600 text-white rounded text-sm" onClick={handleCancelUpload}>Cancel Upload</button>
          ) }
        </div>
        <Button variant="secondary" onClick={() => setFile(null)}>Reset</Button>
      </div>

      {/* Data review / parsed preview section removed as requested */}
      {showCreateProductModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-medium mb-3">Create Product</h3>
            <div className="space-y-2">
              <input className="w-full p-2 border rounded" placeholder="Name" value={createProductForm.name} onChange={(e) => setCreateProductForm((s) => ({ ...s, name: e.target.value }))} />
              <input className="w-full p-2 border rounded" placeholder="Code / SKU" value={createProductForm.code} onChange={(e) => setCreateProductForm((s) => ({ ...s, code: e.target.value }))} />
              <input className="w-full p-2 border rounded" placeholder="Category" value={createProductForm.category} onChange={(e) => setCreateProductForm((s) => ({ ...s, category: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min="0" step="0.01" className="p-2 border rounded" placeholder="MRP" value={createProductForm.mrp} onChange={(e) => setCreateProductForm((s) => ({ ...s, mrp: Number(e.target.value) }))} />
                <input type="number" min="0" step="0.01" className="p-2 border rounded" placeholder="Purchase Price" value={createProductForm.purchasePrice} onChange={(e) => setCreateProductForm((s) => ({ ...s, purchasePrice: Number(e.target.value) }))} />
                <input type="number" min="0" step="0.01" className="p-2 border rounded" placeholder="Selling Price" value={createProductForm.sellingPrice} onChange={(e) => setCreateProductForm((s) => ({ ...s, sellingPrice: Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min="0" className="p-2 border rounded" placeholder="GST %" value={createProductForm.gstPercent} onChange={(e) => setCreateProductForm((s) => ({ ...s, gstPercent: Number(e.target.value) }))} />
                <input type="number" min="0" className="p-2 border rounded" placeholder="Quantity" value={createProductForm.quantity} onChange={(e) => setCreateProductForm((s) => ({ ...s, quantity: Number(e.target.value) }))} />
                <input className="p-2 border rounded" placeholder="Unit" value={createProductForm.unit} onChange={(e) => setCreateProductForm((s) => ({ ...s, unit: e.target.value }))} />
              </div>
              <input className="w-full p-2 border rounded" placeholder="Manufacturer" value={createProductForm.manufacturer} onChange={(e) => setCreateProductForm((s) => ({ ...s, manufacturer: e.target.value }))} />
              <input className="w-full p-2 border rounded" placeholder="Expiry Date" type="date" value={createProductForm.expiryDate} onChange={(e) => setCreateProductForm((s) => ({ ...s, expiryDate: e.target.value }))} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => { setShowCreateProductModal(false); setCreatingProductRow(null); }}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" disabled={createProductLoading} onClick={async () => {
                try {
                  setCreateProductLoading(true);
                  const payload = {
                    code: createProductForm.code,
                    name: createProductForm.name,
                    genericName: '',
                    manufacturer: createProductForm.manufacturer,
                    category: createProductForm.category,
                    mrp: createProductForm.mrp,
                    purchasePrice: createProductForm.purchasePrice,
                    sellingPrice: createProductForm.sellingPrice,
                    gstPercent: createProductForm.gstPercent,
                    quantity: createProductForm.quantity,
                    unit: createProductForm.unit,
                    batchNumber: null,
                    expiryDate: createProductForm.expiryDate || null
                  };
                  const res = await pharmacyService.createProduct(payload);
                  const d = res.data || res;
                  const prod = d || d?.data;
                  // attach product to row
                  if (creatingProductRow !== null) {
                    updateItem(creatingProductRow, 'productId', prod.id || prod?.id);
                    updateItem(creatingProductRow, 'name', prod.name || createProductForm.name);
                    updateItem(creatingProductRow, 'unitPrice', prod.purchasePrice || prod.sellingPrice || 0);
                  }
                  toast.success('Product created');
                  setShowCreateProductModal(false);
                  setCreatingProductRow(null);
                } catch (e) {
                  toast.error('Failed to create product');
                } finally {
                  setCreateProductLoading(false);
                }
              }}>Create Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

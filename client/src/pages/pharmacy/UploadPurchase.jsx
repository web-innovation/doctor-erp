import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { purchaseService } from '../../services/purchaseService';
import { pharmacyService } from '../../services/pharmacyService';

export default function UploadPurchase() {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [supplierId, setSupplierId] = useState('');
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

  const uploadMut = useMutation({
    mutationFn: (form) => purchaseService.uploadInvoice(form),
    onSuccess: (res) => {
      const data = res.data || res;
      setUploadId(data.id || data?.data?.id);
      const p = data.parsedJson ? JSON.parse(data.parsedJson) : null;
      setParsed(p);
      toast.success('File uploaded and parsed (preview)');
    },
    onError: (err) => toast.error('Upload failed')
  });

  const createMut = useMutation({
    mutationFn: ({ id, body }) => purchaseService.createFromUpload(id, body),
    onSuccess: (res) => {
      toast.success('Purchase created from upload');
    },
    onError: () => toast.error('Failed to create purchase')
  });

  const handleUpload = async () => {
    if (!file) return toast.error('Select a file');
    const fd = new FormData();
    fd.append('file', file);
    uploadMut.mutate(fd);
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
      setSubtotal(parsed.subtotal || 0);
      setTaxAmount(parsed.taxAmount || 0);
      setTotalAmount(parsed.totalAmount || 0);
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
      </div>
      <div className="flex gap-2">
        <Button onClick={handleUpload} loading={uploadMut.isLoading}>Upload & Parse</Button>
        <Button variant="secondary" onClick={() => setFile(null)}>Reset</Button>
      </div>

      {parsed && (
        <div className="mt-6">
          <h3 className="font-medium">Parsed Preview & Confirmation</h3>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Input label="Invoice No" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            <Input type="date" label="Invoice Date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            <div>
              <label className="block text-sm text-gray-600">Supplier (search)</label>
              <input value={supplierQuery || (supplierId ? supplierQuery : '')} onChange={(e) => { setSupplierQuery(e.target.value); if (!e.target.value) setSupplierId(''); }} className="w-full p-2 border rounded" placeholder="Search suppliers by name" />
              {supplierSearching && <div className="text-xs text-gray-500">Searching...</div>}
              {supplierOptions.length > 0 && (
                <ul className="bg-white border rounded mt-1 max-h-48 overflow-auto text-sm">
                  {supplierOptions.map((s) => (
                    <li key={s.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setSupplierId(s.id); setSupplierQuery(s.name); setSupplierOptions([]); }}>{s.name} {s.phone ? `· ${s.phone}` : ''}</li>
                  ))}
                </ul>
              )}
              {supplierOptions.length === 0 && supplierQuery && supplierQuery.length >= 2 && (
                <div className="mt-1 text-sm">
                  <button className="px-2 py-1 bg-green-600 text-white rounded text-sm" disabled={createSupplierMutState.loading} onClick={() => { setCreateSupplierForm((f) => ({ ...f, name: supplierQuery })); setShowCreateSupplierModal(true); }}>Create supplier "{supplierQuery}"</button>
                </div>
              )}

              {showCreateSupplierModal && (
                <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center">
                  <div className="bg-white p-6 rounded shadow-lg w-96">
                    <h3 className="text-lg font-medium mb-3">Create Supplier</h3>
                    <div className="space-y-2">
                      <input className="w-full p-2 border rounded" placeholder="Name" value={createSupplierForm.name} onChange={(e) => setCreateSupplierForm((s) => ({ ...s, name: e.target.value }))} />
                      <input className="w-full p-2 border rounded" placeholder="Phone" value={createSupplierForm.phone} onChange={(e) => setCreateSupplierForm((s) => ({ ...s, phone: e.target.value }))} />
                      <input className="w-full p-2 border rounded" placeholder="Email" value={createSupplierForm.email} onChange={(e) => setCreateSupplierForm((s) => ({ ...s, email: e.target.value }))} />
                      <input className="w-full p-2 border rounded" placeholder="Address" value={createSupplierForm.address} onChange={(e) => setCreateSupplierForm((s) => ({ ...s, address: e.target.value }))} />
                      <input className="w-full p-2 border rounded" placeholder="GST Number" value={createSupplierForm.gstNumber} onChange={(e) => setCreateSupplierForm((s) => ({ ...s, gstNumber: e.target.value }))} />
                      <textarea className="w-full p-2 border rounded" placeholder="Notes" value={createSupplierForm.notes} onChange={(e) => setCreateSupplierForm((s) => ({ ...s, notes: e.target.value }))} />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button className="px-3 py-1 border rounded" onClick={() => setShowCreateSupplierModal(false)}>Cancel</button>
                      <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={async () => {
                        try {
                          setCreateSupplierMutState({ loading: true });
                          const s = await purchaseService.createSupplier(createSupplierForm);
                          const d = s.data || s;
                          const sup = d || d?.data;
                          setSupplierId(sup.id || sup?.id);
                          setSupplierQuery(sup.name || createSupplierForm.name);
                          setSupplierOptions([]);
                          toast.success('Supplier created');
                          setShowCreateSupplierModal(false);
                        } catch (e) {
                          toast.error('Failed to create supplier');
                        } finally { setCreateSupplierMutState({ loading: false }); }
                      }}>Create</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Input label="Notes" value={parsed.notes || ''} onChange={() => {}} disabled />
          </div>

          <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Name</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2">Unit Price</th>
                  <th className="p-2">Batch</th>
                  <th className="p-2">Expiry</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2"> </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 relative">
                      <input className="w-full p-1 border rounded" value={it.name} onChange={(e) => updateItem(idx, 'name', e.target.value)} />
                      {productOptions[idx] && productOptions[idx].length > 0 && (
                        <ul className="absolute left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto z-20 text-sm">
                          {productOptions[idx].map((p) => (
                            <li key={p.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => {
                              // select product
                              updateItem(idx, 'productId', p.id);
                              updateItem(idx, 'name', p.name);
                              updateItem(idx, 'unitPrice', p.purchasePrice || p.sellingPrice || 0);
                              setProductOptions((po) => ({ ...po, [idx]: [] }));
                            }}>{p.name} {p.genericName ? `· ${p.genericName}` : ''}</li>
                          ))}
                        </ul>
                      )}
                      {productSearching[idx] && <div className="text-xs text-gray-500">Searching products...</div>}
                      {(!productOptions[idx] || productOptions[idx].length === 0) && !productSearching[idx] && (it.name && it.name.length >= 2) && (
                        <div className="mt-1">
                          <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm" onClick={() => { setCreateProductForm((f) => ({ ...f, name: it.name })); setCreatingProductRow(idx); setShowCreateProductModal(true); }}>Create product "{it.name}"</button>
                        </div>
                      )}
                    </td>
                    <td className="p-2 w-24">
                      <input type="number" min="0" className="w-full p-1 border rounded" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                    </td>
                    <td className="p-2 w-32">
                      <input type="number" min="0" step="0.01" className="w-full p-1 border rounded" value={it.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))} />
                    </td>
                    <td className="p-2 w-36">
                      <input className="w-full p-1 border rounded" value={it.batchNumber || ''} onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)} placeholder="batch" />
                    </td>
                    <td className="p-2 w-36">
                      <input type="date" className="w-full p-1 border rounded" value={it.expiryDate || ''} onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)} />
                    </td>
                    <td className="p-2 w-32">{it.amount?.toFixed ? it.amount.toFixed(2) : it.amount}</td>
                    <td className="p-2 w-24">
                      <button className="text-sm text-red-600" onClick={() => { setItems((prev) => prev.filter((_, i) => i !== idx)); const st = items.filter((_, i) => i !== idx).reduce((s, it) => s + (Number(it.amount)||0), 0); setSubtotal(st); setTotalAmount(+(st + Number(taxAmount||0)).toFixed(2)); }}>Remove</button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td className="p-2" colSpan={5}>No line items detected. You can add items manually later.</td></tr>
                )}
              </tbody>
            </table>
            <div className="mt-2">
              <button className="px-3 py-1 bg-gray-100 rounded text-sm" onClick={() => { setItems((prev) => [...prev, { name: 'Item', quantity: 1, unitPrice: 0, amount: 0, batchNumber: '', expiryDate: '' }]); }}>Add Item</button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-sm">Subtotal: {subtotal.toFixed(2)}</div>
              <div className="text-sm">Tax: <input type="number" min="0" step="0.01" className="w-28 p-1 border rounded inline" value={taxAmount} onChange={(e) => { setTaxAmount(Number(e.target.value)); setTotalAmount(+(Number(subtotal) + Number(e.target.value)).toFixed(2)); }} /></div>
              <div className="text-sm font-medium">Total: {totalAmount.toFixed(2)}</div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirm} loading={createMut.isLoading} disabled={uploadMut.isLoading || createMut.isLoading || createSupplierMutState.loading || createProductLoading}>Create Purchase Draft</Button>
              <Button variant="secondary" onClick={() => { setParsed(null); setUploadId(null); setFile(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}
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

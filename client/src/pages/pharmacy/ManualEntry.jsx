import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useHasPerm } from '../../context/AuthContext';
import ledgerService from '../../services/ledgerService';
import { pharmacyService } from '../../services/pharmacyService';
import { purchaseService } from '../../services/purchaseService';

const STOCK_MODES = ['PURCHASE', 'RETURN'];
const PARTY_MODES = ['PURCHASE', 'RETURN', 'PAYMENT'];

export default function ManualEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const canCreate = useHasPerm('ledger:create');

  const [manualMode, setManualMode] = useState('JOURNAL'); // JOURNAL | PURCHASE | RETURN | PAYMENT | ADJUSTMENT
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH | BANK | UPI

  const [manualDebitAccount, setManualDebitAccount] = useState('');
  const [manualCreditAccount, setManualCreditAccount] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualDate, setManualDate] = useState('');

  const [debitQuery, setDebitQuery] = useState('');
  const [debitOptions, setDebitOptions] = useState([]);
  const [debitSelected, setDebitSelected] = useState(null);
  const [creditQuery, setCreditQuery] = useState('');
  const [creditOptions, setCreditOptions] = useState([]);
  const [creditSelected, setCreditSelected] = useState(null);
  const [debitEditable, setDebitEditable] = useState(true);
  const [creditEditable, setCreditEditable] = useState(true);

  const [supplierName, setSupplierName] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [supplierSelected, setSupplierSelected] = useState(null);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [supplierError, setSupplierError] = useState('');

  const [itemsList, setItemsList] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    mrp: '',
    purchasePrice: '',
    sellingPrice: '',
    gstPercent: '',
    sku: '',
    category: '',
    initialStock: '',
  });
  const [productError, setProductError] = useState('');

  useEffect(() => {
    if (!debitQuery) return setDebitOptions([]);
    const t = setTimeout(async () => {
      try {
        const r = await ledgerService.getAccounts(debitQuery);
        setDebitOptions(r.data?.data || []);
      } catch {
        setDebitOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [debitQuery]);

  useEffect(() => {
    if (!creditQuery) return setCreditOptions([]);
    const t = setTimeout(async () => {
      try {
        const r = await ledgerService.getAccounts(creditQuery);
        setCreditOptions(r.data?.data || []);
      } catch {
        setCreditOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [creditQuery]);

  useEffect(() => {
    if (!productQuery) return setProductOptions([]);
    const t = setTimeout(async () => {
      try {
        const r = await pharmacyService.getProducts({ search: productQuery, limit: 10 });
        setProductOptions(r?.data?.data || r?.data || []);
      } catch {
        setProductOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productQuery]);

  useEffect(() => {
    if (!supplierQuery) return setSupplierOptions([]);
    const t = setTimeout(async () => {
      try {
        const r = await purchaseService.getSuppliers(supplierQuery);
        setSupplierOptions(r?.data?.data || r?.data || []);
      } catch {
        setSupplierOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [supplierQuery]);

  useEffect(() => {
    const subtotal = itemsList.reduce((s, it) => s + (Number(it.unitPrice || 0) * Number(it.quantity || 0)), 0);
    const tax = itemsList.reduce((s, it) => s + ((Number(it.unitPrice || 0) * Number(it.quantity || 0)) * (Number(it.gstPercent || 0) / 100)), 0);
    const total = subtotal + tax;

    if (STOCK_MODES.includes(manualMode)) {
      setManualAmount(String(Number(total.toFixed(2))));
    }

    if (manualMode === 'PURCHASE') {
      setManualDebitAccount('Inventory');
      setManualCreditAccount(supplierSelected?.name ? `Payable - ${supplierSelected.name}` : 'Accounts Payable');
      setDebitEditable(false);
      setCreditEditable(false);
      return;
    }

    if (manualMode === 'RETURN') {
      setManualDebitAccount(supplierSelected?.name ? `Payable - ${supplierSelected.name}` : 'Accounts Payable');
      setManualCreditAccount('Inventory');
      setDebitEditable(false);
      setCreditEditable(false);
      return;
    }

    if (manualMode === 'PAYMENT') {
      setManualDebitAccount(supplierSelected?.name ? `Payable - ${supplierSelected.name}` : 'Accounts Payable');
      setManualCreditAccount(paymentMethod === 'BANK' ? 'Bank' : paymentMethod === 'UPI' ? 'UPI' : 'Cash');
      setDebitEditable(false);
      setCreditEditable(false);
      return;
    }

    if (manualMode === 'ADJUSTMENT') {
      if (!manualDebitAccount) setManualDebitAccount('Inventory');
      if (!manualCreditAccount) setManualCreditAccount('Inventory Adjustment');
      setDebitEditable(true);
      setCreditEditable(true);
      return;
    }

    setDebitEditable(true);
    setCreditEditable(true);
  }, [manualMode, itemsList, supplierSelected, paymentMethod, manualDebitAccount, manualCreditAccount]);

  useEffect(() => {
    const s = location?.state;
    if (!s) return;
    if (s.mode) setManualMode(s.mode);
    if (Array.isArray(s.items) && s.items.length) {
      setItemsList(s.items.map((it) => ({
        productId: it.productId,
        name: it.name,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        gstPercent: Number(it.gstPercent || 0),
        batchNumber: it.batchNumber || '',
        expiryDate: it.expiryDate || '',
      })));
    }
    if (s.supplierName) setSupplierName(s.supplierName);
  }, [location]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('manualPrefill');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.mode) setManualMode(s.mode);
      if (Array.isArray(s.items) && s.items.length) setItemsList(s.items);
      if (s.supplierName) setSupplierName(s.supplierName);
      localStorage.removeItem('manualPrefill');
    } catch {
      // ignore prefill parse issues
    }
  }, []);

  const handleCreateSupplier = async () => {
    const name = newSupplierName?.trim();
    setSupplierError('');
    if (!name) return setSupplierError('Enter supplier name');
    try {
      const res = await purchaseService.createSupplier({ name });
      const s = res.data?.data || res.data || res;
      setSupplierSelected(s);
      setSupplierName(s.name);
      setNewSupplierName('');
      setShowCreateSupplierModal(false);
      toast.success('Supplier created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create supplier');
    }
  };

  const handleCreateProduct = async () => {
    setProductError('');
    if (!newProduct.name || !newProduct.mrp) {
      setProductError('Provide product name and MRP');
      return;
    }
    try {
      const payload = {
        name: newProduct.name,
        code: newProduct.sku || undefined,
        category: newProduct.category || 'medicine',
        mrp: parseFloat(newProduct.mrp),
        sellingPrice: newProduct.sellingPrice ? parseFloat(newProduct.sellingPrice) : parseFloat(newProduct.mrp),
        purchasePrice: newProduct.purchasePrice ? parseFloat(newProduct.purchasePrice) : parseFloat(newProduct.mrp),
        gstPercent: newProduct.gstPercent ? parseFloat(newProduct.gstPercent) : 0,
        quantity: newProduct.initialStock ? parseInt(newProduct.initialStock, 10) : 0,
      };
      const res = await pharmacyService.createProduct(payload);
      const p = res.data?.data || res.data || res;
      setItemsList((s) => ([
        ...s,
        {
          productId: p.id,
          name: p.name,
          quantity: 1,
          unitPrice: p.purchasePrice || p.mrp || 0,
          gstPercent: p.gstPercent || 0,
          batchNumber: '',
          expiryDate: '',
        },
      ]));
      setShowCreateProductModal(false);
      setNewProduct({
        name: '',
        mrp: '',
        purchasePrice: '',
        sellingPrice: '',
        gstPercent: '',
        sku: '',
        category: '',
        initialStock: '',
      });
      toast.success('Product created and added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create product');
    }
  };

  const resolveOrCreateAccount = async (selected, accountName) => {
    if (selected?.id) return selected.id;
    const name = accountName?.trim();
    if (!name) return null;
    const created = await ledgerService.createAccount({ name });
    return created.data?.data?.id || created.data?.id || null;
  };

  const submitJournalLikeMode = async () => {
    if ((!debitSelected && !manualDebitAccount) || (!creditSelected && !manualCreditAccount) || !manualAmount) {
      toast.error('Provide debit, credit and amount');
      return false;
    }
    const debitId = await resolveOrCreateAccount(debitSelected, manualDebitAccount);
    const creditId = await resolveOrCreateAccount(creditSelected, manualCreditAccount);
    const refType = manualMode === 'PAYMENT' ? 'PAYMENT' : manualMode === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'MANUAL';

    await ledgerService.createManualEntry({
      debitAccountId: debitId,
      creditAccountId: creditId,
      amount: Number(manualAmount),
      note: manualNote || undefined,
      date: manualDate || undefined,
      refType,
    });
    return true;
  };

  const submitStockMode = async () => {
    if (!STOCK_MODES.includes(manualMode)) return false;
    if (itemsList.length === 0) {
      toast.error('Add at least one item');
      return false;
    }
    await ledgerService.createManualPurchase({
      mode: manualMode,
      supplierId: supplierSelected?.id,
      supplierName: supplierName || undefined,
      items: itemsList,
      note: manualNote || undefined,
      date: manualDate || undefined,
    });
    return true;
  };

  const handleSubmit = async () => {
    try {
      if (STOCK_MODES.includes(manualMode)) {
        const ok = await submitStockMode();
        if (!ok) return;
      } else {
        const ok = await submitJournalLikeMode();
        if (!ok) return;
      }
      toast.success('Manual entry created');
      navigate('/ledger');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create manual entry');
    }
  };

  if (!canCreate) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded">You do not have permission to access this page.</div>
      </div>
    );
  }

  const showSupplierSection = PARTY_MODES.includes(manualMode);
  const showItemsSection = STOCK_MODES.includes(manualMode);
  const previewAmount = Number(manualAmount || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Manual Ledger Entry</h2>
          <button className="px-3 py-1 border rounded" onClick={() => navigate('/ledger')}>Back</button>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-600 bg-yellow-50 border-l-4 border-yellow-300 p-3 rounded">
            Quick help: pick mode first. Purchases/returns update stock. Payments and adjustments only post ledger entries.
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Mode</div>
            <select value={manualMode} onChange={(e) => setManualMode(e.target.value)} className="p-2 border rounded w-full">
              <option value="JOURNAL">Journal (debit/credit)</option>
              <option value="PURCHASE">Manual Purchase (add stock)</option>
              <option value="RETURN">Manual Return (reduce stock)</option>
              <option value="PAYMENT">Supplier Payment</option>
              <option value="ADJUSTMENT">Adjustment Entry</option>
            </select>
          </div>

          {showSupplierSection && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Supplier / Distributor</div>
              <div className="relative">
                <input
                  className="w-full p-2 border rounded"
                  placeholder="Supplier name"
                  value={supplierSelected ? supplierSelected.name : (supplierQuery || supplierName)}
                  onChange={(e) => {
                    setSupplierQuery(e.target.value);
                    setSupplierName(e.target.value);
                    setSupplierSelected(null);
                  }}
                />
                {supplierOptions.length > 0 && supplierQuery && (
                  <div className="absolute z-30 bg-white border rounded mt-1 w-full max-h-48 overflow-auto">
                    {supplierOptions.map((s) => (
                      <div
                        key={s.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSupplierSelected(s);
                          setSupplierName(s.name);
                          setSupplierQuery('');
                          setSupplierOptions([]);
                        }}
                      >
                        {s.name} {s.phone ? `- ${s.phone}` : ''}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    className="px-2 py-1 text-sm border rounded"
                    onClick={() => {
                      setShowCreateSupplierModal((s) => !s);
                      setSupplierError('');
                    }}
                  >
                    {showCreateSupplierModal ? 'Close' : 'Create supplier'}
                  </button>
                  {supplierSelected && (
                    <button className="px-2 py-1 text-sm border rounded" onClick={() => { setSupplierSelected(null); setSupplierName(''); }}>
                      Clear
                    </button>
                  )}
                </div>

                {showCreateSupplierModal && (
                  <div className="mt-3 p-3 border rounded bg-gray-50">
                    <div className="text-sm font-medium">Create supplier</div>
                    <input
                      className="mt-2 p-2 border w-full"
                      value={newSupplierName}
                      onChange={(e) => {
                        setNewSupplierName(e.target.value);
                        setSupplierError('');
                      }}
                      placeholder="Supplier name"
                    />
                    {supplierError && <div className="text-sm text-red-600 mt-2">{supplierError}</div>}
                    <div className="mt-3 flex justify-end gap-2">
                      <button className="px-2 py-1 border rounded" onClick={() => setShowCreateSupplierModal(false)}>Cancel</button>
                      <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={handleCreateSupplier}>Create</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {manualMode === 'PAYMENT' && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Payment Method</div>
              <select className="p-2 border rounded w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
          )}

          {showItemsSection && (
            <>
              <div>
                <div className="text-xs text-gray-500 mb-1">Add product</div>
                <div className="flex gap-2">
                  <input className="flex-1 p-2 border rounded" placeholder="Search medicine" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => {
                      setShowCreateProductModal((s) => !s);
                      setProductError('');
                    }}
                  >
                    {showCreateProductModal ? 'Close' : 'New'}
                  </button>
                </div>
                {productOptions.length > 0 && productQuery && (
                  <div className="border bg-white max-h-44 overflow-auto mt-1">
                    {productOptions.map((p) => (
                      <div
                        key={p.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setItemsList((s) => ([
                            ...s,
                            {
                              productId: p.id,
                              name: p.name,
                              quantity: 1,
                              unitPrice: p.purchasePrice || p.mrp || 0,
                              gstPercent: p.gstPercent || 0,
                              batchNumber: '',
                              expiryDate: '',
                            },
                          ]));
                          setProductQuery('');
                          setProductOptions([]);
                        }}
                      >
                        {p.name} - {p.code || ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {showCreateProductModal && (
                <div className="mt-3 p-3 border rounded bg-gray-50">
                  <div className="text-sm font-medium">Create product</div>
                  {productError && <div className="text-sm text-red-600 mt-2">{productError}</div>}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input className="p-2 border" placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct((s) => ({ ...s, name: e.target.value }))} />
                    <input className="p-2 border" placeholder="SKU (optional)" value={newProduct.sku} onChange={(e) => setNewProduct((s) => ({ ...s, sku: e.target.value }))} />
                    <input className="p-2 border" placeholder="MRP" value={newProduct.mrp} onChange={(e) => setNewProduct((s) => ({ ...s, mrp: e.target.value }))} />
                    <input className="p-2 border" placeholder="Purchase Price" value={newProduct.purchasePrice} onChange={(e) => setNewProduct((s) => ({ ...s, purchasePrice: e.target.value }))} />
                    <input className="p-2 border" placeholder="Selling Price" value={newProduct.sellingPrice} onChange={(e) => setNewProduct((s) => ({ ...s, sellingPrice: e.target.value }))} />
                    <input className="p-2 border" placeholder="GST %" value={newProduct.gstPercent} onChange={(e) => setNewProduct((s) => ({ ...s, gstPercent: e.target.value }))} />
                    <input className="p-2 border col-span-2" placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct((s) => ({ ...s, category: e.target.value }))} />
                    <input className="p-2 border col-span-2" placeholder="Initial Stock (optional)" value={newProduct.initialStock} onChange={(e) => setNewProduct((s) => ({ ...s, initialStock: e.target.value }))} />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button className="px-2 py-1 border rounded" onClick={() => setShowCreateProductModal(false)}>Cancel</button>
                    <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={handleCreateProduct}>Create and Add</button>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-gray-500 mb-1">Items</div>
                <div className="space-y-2">
                  {itemsList.map((it, idx) => {
                    const qty = Number(it.quantity || 0);
                    const rate = Number(it.unitPrice || 0);
                    const gstPct = Number(it.gstPercent || 0);
                    const amount = qty * rate;
                    const gstAmount = amount * (gstPct / 100);
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <div>{it.name}</div>
                          <div className="flex gap-2 mt-1">
                            <input
                              aria-label={`batch-${idx}`}
                              placeholder="Batch"
                              className="p-1 border rounded w-36"
                              value={it.batchNumber || ''}
                              onChange={(e) => setItemsList((s) => s.map((x, i) => (i === idx ? { ...x, batchNumber: e.target.value } : x)))}
                            />
                            <input
                              aria-label={`expiry-${idx}`}
                              type="date" lang="en-GB" placeholder="dd/mm/yyyy"
                              className="p-1 border rounded w-36"
                              value={it.expiryDate || ''}
                              onChange={(e) => setItemsList((s) => s.map((x, i) => (i === idx ? { ...x, expiryDate: e.target.value } : x)))}
                            />
                          </div>
                        </div>
                        <input
                          aria-label={`quantity-${idx}`}
                          type="number"
                          min={1}
                          className="w-20 p-1 border rounded text-right"
                          value={it.quantity}
                          onChange={(e) => setItemsList((s) => s.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))}
                        />
                        <input
                          aria-label={`rate-${idx}`}
                          type="number"
                          step="0.01"
                          className="w-28 p-1 border rounded text-right"
                          value={it.unitPrice}
                          onChange={(e) => setItemsList((s) => s.map((x, i) => (i === idx ? { ...x, unitPrice: Number(e.target.value) } : x)))}
                        />
                        <input
                          aria-label={`gst-${idx}`}
                          type="number"
                          step="0.01"
                          className="w-20 p-1 border rounded text-right"
                          value={it.gstPercent}
                          onChange={(e) => setItemsList((s) => s.map((x, i) => (i === idx ? { ...x, gstPercent: Number(e.target.value) } : x)))}
                        />
                        <div className="w-28 text-right text-sm text-gray-700">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount + gstAmount)}
                        </div>
                        <button className="px-2 py-1 text-sm bg-red-100 rounded" onClick={() => setItemsList((s) => s.filter((_, i) => i !== idx))}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-gray-500 mb-1">Debit account</div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                Auto-selected for guided modes
                <button type="button" className="text-xs text-blue-600" onClick={() => setDebitEditable((s) => !s)}>
                  {debitEditable ? 'Edit' : 'Lock'}
                </button>
              </div>
            </div>
            <input
              readOnly={!debitEditable}
              className={`w-full p-2 border rounded ${!debitEditable ? 'bg-gray-100' : ''}`}
              placeholder="Search debit account"
              value={debitQuery || manualDebitAccount}
              onChange={(e) => {
                setDebitQuery(e.target.value);
                setManualDebitAccount(e.target.value);
                setDebitSelected(null);
              }}
            />
            {debitOptions.length > 0 && debitQuery && (
              <div className="border bg-white max-h-44 overflow-auto mt-1">
                {debitOptions.map((a) => (
                  <div
                    key={a.id}
                    className="p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setDebitSelected(a);
                      setDebitQuery(a.name);
                      setManualDebitAccount(a.name);
                      setDebitOptions([]);
                    }}
                  >
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <div className="text-xs text-gray-500 mb-1">Credit account</div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                Auto-selected for guided modes
                <button type="button" className="text-xs text-blue-600" onClick={() => setCreditEditable((s) => !s)}>
                  {creditEditable ? 'Edit' : 'Lock'}
                </button>
              </div>
            </div>
            <input
              readOnly={!creditEditable}
              className={`w-full p-2 border rounded ${!creditEditable ? 'bg-gray-100' : ''}`}
              placeholder="Search credit account"
              value={creditQuery || manualCreditAccount}
              onChange={(e) => {
                setCreditQuery(e.target.value);
                setManualCreditAccount(e.target.value);
                setCreditSelected(null);
              }}
            />
            {creditOptions.length > 0 && creditQuery && (
              <div className="border bg-white max-h-44 overflow-auto mt-1">
                {creditOptions.map((a) => (
                  <div
                    key={a.id}
                    className="p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setCreditSelected(a);
                      setCreditQuery(a.name);
                      setManualCreditAccount(a.name);
                      setCreditOptions([]);
                    }}
                  >
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500 mt-1">
            Suggested mapping:
            <ul className="list-disc ml-5">
              <li><strong>Purchase:</strong> Debit Inventory, Credit Payable - Supplier</li>
              <li><strong>Return:</strong> Debit Payable - Supplier, Credit Inventory</li>
              <li><strong>Payment:</strong> Debit Payable - Supplier, Credit Cash/Bank/UPI</li>
              <li><strong>Adjustment:</strong> Uses refType ADJUSTMENT for audit clarity</li>
            </ul>
          </div>

          <div>
            <input className="w-full p-2 border rounded" placeholder="Amount" type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
              <input className="w-full p-2 border rounded mt-2" placeholder="Date (optional)" type="date" lang="en-GB" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
            <textarea className="w-full p-2 border rounded mt-2" placeholder="Note (optional)" value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
            {previewAmount > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Amount preview: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(previewAmount)}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 border rounded" onClick={() => navigate('/ledger')}>Cancel</button>
            <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={handleSubmit}>Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}

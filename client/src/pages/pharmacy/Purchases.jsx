import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { purchaseService } from '../../services/purchaseService';
import { useHasPerm } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { pharmacyService } from '../../services/pharmacyService';

function parseParsedJson(upload) {
  if (!upload?.parsedJson) return null;
  try {
    return typeof upload.parsedJson === 'string' ? JSON.parse(upload.parsedJson) : upload.parsedJson;
  } catch (e) {
    return null;
  }
}

function mergeParsedIntoPurchase(purchase) {
  if (!purchase) return purchase;
  const parsed = parseParsedJson(purchase.upload);
  if (!parsed) return purchase;
  const parsedItems = Array.isArray(parsed.items) ? parsed.items : [];
  const roundOff = Number(
    parsed?.roundOff ??
    parsed?.round_off ??
    parsed?.totals?.roundOff ??
    parsed?.totals?.round_off ??
    purchase?.roundOff ??
    purchase?.roundoff ??
    0
  );
  const mergedItems = Array.isArray(purchase.items)
    ? purchase.items.map((it, idx) => ({
      ...it,
      mrp: Number(it?.mrp ?? parsedItems[idx]?.mrp ?? parsedItems[idx]?.MRP ?? 0)
    }))
    : [];
  return { ...purchase, roundOff, roundoff: roundOff, items: mergedItems };
}

function resolveUploadImageSrc(upload) {
  if (!upload) return '';
  const rawPath = upload.path || '';
  if (rawPath && (/^https?:\/\//i.test(rawPath) || rawPath.startsWith('/'))) return rawPath;
  if (upload.filename) return `/uploads/purchases/${upload.filename}`;
  return '';
}

export default function Purchases() {
  const canRead = useHasPerm('purchases:read');
  const canDelete = useHasPerm('purchases:delete');
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchases', 'DRAFT'],
    queryFn: () => purchaseService.getPurchases({ status: 'DRAFT', limit: 50 }),
    enabled: !!canRead
  });

  const payload = (data?.data) || data || {};
  const list = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);

  const [fetchedSuppliers, setFetchedSuppliers] = useState({});

  const [editPurchase, setEditPurchase] = useState(null);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [supplierSearching, setSupplierSearching] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [itemsState, setItemsState] = useState([]);
  const [productOptions, setProductOptions] = useState({});
  const [productSearching, setProductSearching] = useState({});
  const [productQueries, setProductQueries] = useState({});
  const searchTimeouts = useRef({});
  const canReceive = useHasPerm('purchases:receive');

  useEffect(() => {
    if (!supplierQuery || supplierQuery.length < 2) {
      setSupplierOptions([]);
      return;
    }
    setSupplierSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await purchaseService.getSuppliers(supplierQuery);
        const list = r?.data || r;
        setSupplierOptions(Array.isArray(list) ? list : []);
      } catch (e) {
        setSupplierOptions([]);
      } finally { setSupplierSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [supplierQuery]);

  // initialize editable items when a different purchase is loaded (by id)
  useEffect(() => {
    if (!editPurchase) return;
    const its = Array.isArray(editPurchase.items) ? editPurchase.items.map(it => ({
      id: it.id,
      productId: it.productId,
      name: it.name,
      quantity: Number(it.quantity || 0),
      unitPrice: Number(it.unitPrice || it.purchasePrice || 0),
      mrp: Number(it.mrp || 0),
      taxAmount: Number(it.taxAmount || 0),
      amount: Number(it.amount || 0),
      batchNumber: it.batchNumber || null,
      expiryDate: it.expiryDate ? (new Date(it.expiryDate).toISOString().slice(0,10)) : '',
      newEntry: false
    })) : [];
    setItemsState(its);
  }, [editPurchase && editPurchase.id]);

  // recompute totals when items change
  useEffect(() => {
    if (!editPurchase) return;
    // Use item.amount as source of truth (supports manual edits to amount)
    const subtotal = itemsState.reduce((s, it) => s + (Number(it.amount || (Number(it.quantity || 0) * Number(it.unitPrice || 0)))), 0);
    const tax = Number(editPurchase.taxAmount || 0);
    const roundOff = Number((editPurchase.roundOff ?? editPurchase.roundoff) || 0);
    // Apply roundOff as an adjustment (subtract) to match invoice behavior
    const total = +(subtotal + tax - roundOff).toFixed(2);
    setEditPurchase((s) => ({ ...s, subtotal: +(subtotal.toFixed ? subtotal.toFixed(2) : subtotal), totalAmount: total, roundOff }));
  }, [itemsState, editPurchase?.taxAmount, editPurchase?.roundOff, editPurchase?.roundoff]);

  // cleanup product search timers on unmount
  useEffect(() => {
    return () => {
      try { Object.values(searchTimeouts.current || {}).forEach(t => clearTimeout(t)); } catch (e) {}
    };
  }, []);
  const handleProductSearch = (idx, val) => {
    setProductQueries(q => ({ ...q, [idx]: val }));
    // debounce product search
    if (searchTimeouts.current[idx]) clearTimeout(searchTimeouts.current[idx]);
    if (!val || val.length < 2) {
      setProductOptions(po => ({ ...po, [idx]: [] }));
      setProductSearching(ps => ({ ...ps, [idx]: false }));
      return;
    }
    setProductSearching(ps => ({ ...ps, [idx]: true }));
    searchTimeouts.current[idx] = setTimeout(async () => {
      try {
        const res = await pharmacyService.getProducts({ search: val, limit: 10 });
        const data = res.data || res;
        setProductOptions(po => ({ ...po, [idx]: Array.isArray(data) ? data : [] }));
      } catch (e) {
        setProductOptions(po => ({ ...po, [idx]: [] }));
      } finally {
        setProductSearching(ps => ({ ...ps, [idx]: false }));
      }
    }, 300);
  };

  const saveSupplier = async () => {
    if (!editPurchase) return;
    try {
      await purchaseService.updatePurchase(editPurchase.id, { supplierId: selectedSupplierId });
      toast.success('Purchase updated');
      // close inline editor and refresh list
      setEditPurchase(null);
      setSelectedSupplierId(null);
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update purchase');
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Purchases — Drafts</h1>
            <p className="text-gray-500 mt-1">Draft purchases created from uploads</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No draft purchases found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Invoice No</th>
                  <th className="p-3 text-left">Supplier</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{p.invoiceNo}</td>
                    <td className="p-3">{p.supplier?.name || (fetchedSuppliers[p.supplierId] ? fetchedSuppliers[p.supplierId].name : (p.supplierId ? 'Assigned' : '—'))}</td>
                    <td className="p-3">{p.invoiceDate ? new Date(p.invoiceDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td className="p-3 text-right">{p.totalAmount?.toFixed ? p.totalAmount.toFixed(2) : p.totalAmount}</td>
                    <td className="p-3">{p.status}</td>
                    <td className="p-3 text-right flex items-center justify-end gap-2">
                      <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm" onClick={async () => {
                        // Fetch fresh purchase details (includes items + supplier + upload)
                        try {
                          const r = await purchaseService.getPurchase(p.id);
                          const full = mergeParsedIntoPurchase(r?.data?.data || r?.data || r);
                          setEditPurchase(full);
                          setSelectedSupplierId(full.supplierId || null);
                          setSupplierQuery(full.supplier?.name || '');
                        } catch (e) {
                          console.error('Failed to load purchase', e);
                          toast.error('Failed to load purchase');
                        }
                      }}>Edit</button>
                      {canDelete && (
                        <button className="px-2 py-1 bg-red-600 text-white rounded text-sm" onClick={async () => {
                          if (!window.confirm('Delete this draft purchase? This cannot be undone.')) return;
                          try {
                            await purchaseService.deletePurchase(p.id);
                            toast.success('Draft purchase deleted');
                            await refetch();
                          } catch (err) {
                            console.error(err);
                            toast.error(err?.response?.data?.message || 'Failed to delete purchase');
                          }
                        }}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Inline edit view — when editPurchase is set, show full-page editor replacing list */}
        {editPurchase && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Edit Draft Purchase</h2>
                <p className="text-sm text-gray-500">Edit purchase details created from upload</p>
              </div>
                <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={async () => { setEditPurchase(null); await refetch(); }}>Back to list</button>
                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={async () => {
                  // Publish flow: save edits (including items) then optionally receive
                  try {
                    // If any items are marked as newEntry, create products first and bind their ids
                    const itemsToUse = itemsState.map(it => ({ ...it }));
                    for (let i = 0; i < itemsToUse.length; i++) {
                      const it = itemsToUse[i];
                      if (it.newEntry && !it.productId) {
                        const sku = `SKU${Date.now().toString().slice(-6)}${Math.floor(Math.random()*900+100)}`;
                        const payload = {
                          code: sku,
                          name: it.name || `Product-${sku}`,
                          genericName: '',
                          manufacturer: '',
                          category: '',
                          mrp: it.mrp || 0,
                          purchasePrice: it.unitPrice || 0,
                          sellingPrice: it.unitPrice || 0,
                          gstPercent: 0,
                          quantity: 0,
                          unit: 'pcs'
                        };
                        try {
                          const resp = await pharmacyService.createProduct(payload);
                          const d = resp.data || resp;
                          const prod = d || d?.data;
                          const pid = prod?.id || prod?.data?.id;
                          if (pid) {
                            itemsToUse[i].productId = pid;
                            setItemsState(s => s.map((x, j) => j === i ? ({ ...x, productId: pid }) : x));
                            toast.success(`Created product ${prod.name || payload.name}`);
                          }
                        } catch (err) {
                          console.error('Failed to create product', err);
                          toast.error(`Failed to create product for item ${it.name}`);
                        }
                      }
                    }

                    const body = {
                      supplierId: selectedSupplierId || null,
                      invoiceNo: editPurchase.invoiceNo,
                      invoiceDate: editPurchase.invoiceDate,
                      notes: editPurchase.notes,
                      subtotal: Number(editPurchase.subtotal || 0),
                      taxAmount: Number(editPurchase.taxAmount || 0),
                      roundOff: Number((editPurchase.roundOff ?? editPurchase.roundoff) || 0),
                      totalAmount: Number(editPurchase.totalAmount || 0),
                      items: itemsToUse.map(it => ({ name: it.name, productId: it.productId || undefined, quantity: Number(it.quantity || 0), unitPrice: Number(it.unitPrice || 0), mrp: Number(it.mrp || 0), taxAmount: Number(it.taxAmount || 0), amount: Number(it.amount || (Number(it.quantity || 0) * Number(it.unitPrice || 0))), batchNumber: it.batchNumber || null, expiryDate: it.expiryDate || null }))
                    };

                    await purchaseService.updatePurchase(editPurchase.id, body);
                    toast.success('Purchase saved');
                    // refresh and sync local items state from server
                    const r = await purchaseService.getPurchase(editPurchase.id);
                    const full = mergeParsedIntoPurchase(r?.data?.data || r?.data || r);
                    setEditPurchase(full);
                    if (full && Array.isArray(full.items)) {
                      const its = full.items.map(it => ({
                        id: it.id,
                        productId: it.productId,
                        name: it.name,
                        quantity: Number(it.quantity || 0),
                        unitPrice: Number(it.unitPrice || it.purchasePrice || 0),
                        mrp: Number(it.mrp || 0),
                        taxAmount: Number(it.taxAmount || 0),
                        amount: Number(it.amount || 0),
                        batchNumber: it.batchNumber || null,
                        expiryDate: it.expiryDate ? (new Date(it.expiryDate).toISOString().slice(0,10)) : ''
                      }));
                      setItemsState(its);
                    }
                    await refetch();

                    if (canReceive) {
                      if (window.confirm('Publish now and update stock/ledger (Receive)?')) {
                        try {
                          await purchaseService.receivePurchase(editPurchase.id);
                          toast.success('Purchase published and stock updated');
                          setEditPurchase(null);
                          await refetch();
                        } catch (recvErr) {
                          console.error(recvErr);
                          toast.error('Saved but failed to publish (receive)');
                        }
                      }
                    } else {
                      // If user can't receive, treat publish as save only
                      setEditPurchase(null);
                    }
                  } catch (e) {
                    console.error(e);
                    toast.error('Failed to publish purchase');
                  }
                }}>Publish</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <div className="mb-4">
                  <label className="block text-sm text-gray-600">Invoice No</label>
                  <input className="w-full p-2 border rounded" value={editPurchase.invoiceNo || ''} onChange={(e) => setEditPurchase((s) => ({ ...s, invoiceNo: e.target.value }))} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-600">Invoice Date</label>
                  <input type="date" lang="en-GB" placeholder="dd/mm/yyyy" className="w-full p-2 border rounded" value={editPurchase.invoiceDate ? new Date(editPurchase.invoiceDate).toISOString().slice(0,10) : ''} onChange={(e) => setEditPurchase((s) => ({ ...s, invoiceDate: e.target.value }))} />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-600">Supplier (search)</label>
                  <input value={supplierQuery} onChange={(e) => { setSupplierQuery(e.target.value); setSelectedSupplierId(null); }} className="w-full p-2 border rounded" placeholder="Search suppliers by name" />
                  {supplierSearching && <div className="text-xs text-gray-500">Searching...</div>}
                  {supplierOptions.length > 0 && (
                    <ul className="bg-white border rounded mt-1 max-h-48 overflow-auto text-sm">
                      {supplierOptions.map((s) => (
                        <li key={s.id} className={`p-2 hover:bg-gray-50 cursor-pointer ${selectedSupplierId === s.id ? 'bg-gray-100' : ''}`} onClick={() => { setSelectedSupplierId(s.id); setSupplierQuery(s.name); setSupplierOptions([]); }}>{s.name} {s.phone ? `· ${s.phone}` : ''}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-600">Notes</label>
                  <textarea className="w-full p-2 border rounded" value={editPurchase.notes || ''} onChange={(e) => setEditPurchase((s) => ({ ...s, notes: e.target.value }))} />
                </div>

                <div className="mt-6">
                  <h3 className="font-medium mb-2">Items</h3>
                  <div className="overflow-x-auto overflow-y-auto max-h-[40vh]">
                    <table className="min-w-max w-full text-sm border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2">Link Product</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Unit Price</th>
                           <th className="p-2">MRP</th>
                          <th className="p-2">Batch</th>
                          <th className="p-2">Expiry</th>
                          <th className="p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(itemsState) && itemsState.map((it, idx) => (
                          <tr key={it.id || idx} className="border-t">
                            <td className="p-2 relative">
                              <input
                                className="w-full p-1 border rounded"
                                value={it.name || ''}
                                onChange={(e) => setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, name: e.target.value }) : x))}
                              />
                              <div className="mt-1 text-xs">
                                <label className="inline-flex items-center gap-2">
                                  <input type="checkbox" checked={!!it.newEntry} onChange={(e) => setItemsState(s => s.map((x,i) => i===idx?({...x, newEntry: e.target.checked}):x))} />
                                  <span>Mark as new product</span>
                                </label>
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="relative">
                                <input
                                  className="w-full p-1 border rounded"
                                  placeholder="Search products"
                                  value={productQueries[idx] || ''}
                                  onChange={(e) => handleProductSearch(idx, e.target.value)}
                                />
                                {productSearching[idx] && <div className="text-xs text-gray-500">Searching products...</div>}
                                {productOptions[idx] && productOptions[idx].length > 0 && (
                                  <ul className="absolute left-0 right-0 bg-white border mt-1 max-h-56 overflow-auto z-20 text-sm">
                                    {productOptions[idx].map((p) => (
                                      <li key={p.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => {
                                        // Link product only: do NOT override invoice-provided name/quantity/price/mrp
                                        setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, productId: p.id }) : x));
                                        setProductOptions(po => ({ ...po, [idx]: [] }));
                                        setProductQueries(q => ({ ...q, [idx]: p.name }));
                                      }}>{p.name} {p.genericName ? `· ${p.genericName}` : ''}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <input
                                type="number" min={0}
                                className="w-14 p-1 border rounded"
                                value={String(it.quantity || 0)}
                                onChange={(e) => {
                                  const q = Number(e.target.value || 0);
                                  setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, quantity: q, amount: +(q * (Number(x.unitPrice || 0))).toFixed(2) }) : x));
                                }}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number" step="0.01" min={0}
                                className="w-20 p-1 border rounded"
                                value={String(it.unitPrice || 0)}
                                onChange={(e) => {
                                  const up = Number(e.target.value || 0);
                                  setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, unitPrice: up, amount: +(Number(x.quantity || 0) * up).toFixed(2) }) : x));
                                }}
                              />
                            </td>
                              <td className="p-2">
                                <input
                                  type="number" step="0.01" min={0}
                                  className="w-20 p-1 border rounded"
                                  value={String(it.mrp || 0)}
                                  onChange={(e) => setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, mrp: Number(e.target.value || 0) }) : x))}
                                />
                              </td>
                            <td className="p-2">
                              <input
                                className="w-32 p-1 border rounded"
                                value={it.batchNumber || ''}
                                onChange={(e) => setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, batchNumber: e.target.value }) : x))}
                                placeholder="batch"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="date" lang="en-GB" placeholder="dd/mm/yyyy"
                                className="w-36 p-1 border rounded"
                                value={it.expiryDate || ''}
                                onChange={(e) => setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, expiryDate: e.target.value }) : x))}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number" step="0.01" min={0}
                                className="w-20 p-1 border rounded"
                                value={String(it.amount || 0)}
                                onChange={(e) => {
                                  const amt = Number(e.target.value || 0);
                                  setItemsState(s => s.map((x, i) => i === idx ? ({ ...x, amount: amt, unitPrice: (Number(x.quantity || 0) > 0) ? +(amt / Number(x.quantity || 1)).toFixed(2) : x.unitPrice }) : x));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-600">Totals</label>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between"><span>Subtotal</span><span>{Number(editPurchase.subtotal || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{Number(editPurchase.taxAmount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Roundoff (adjustment)</span>
                      <input type="number" step="0.01" className="w-24 p-1 border rounded text-right" value={String(editPurchase.roundOff ?? editPurchase.roundoff ?? 0)} onChange={(e) => setEditPurchase(s => ({ ...s, roundOff: Number(e.target.value || 0) }))} />
                    </div>
                    <div className="flex justify-between font-semibold mt-2"><span>Total</span><span>{Number(editPurchase.totalAmount || 0).toFixed(2)}</span></div>
                  </div>
                </div>

                {editPurchase.upload && (
                  <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-2">Parsed Invoice</label>
                    <div className="border rounded p-2">
                      {/* Attempt to render image if upload.path or filename present */}
                      {resolveUploadImageSrc(editPurchase.upload) ? (
                        <img src={resolveUploadImageSrc(editPurchase.upload)} alt="invoice" className="max-w-full h-auto rounded" />
                      ) : editPurchase.upload.filename ? (
                        <img src={`/uploads/purchases/${editPurchase.upload.filename}`} alt="invoice" className="max-w-full h-auto rounded" />
                      ) : (
                        <pre className="text-xs text-gray-600">{editPurchase.upload.parsedJson ? JSON.stringify(JSON.parse(editPurchase.upload.parsedJson), null, 2) : 'No parsed data available'}</pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    
    </>
  );
}

// Edit modal and helpers
export function PurchasesWithEdit() { return <Purchases /> }

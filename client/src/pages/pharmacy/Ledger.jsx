import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import ledgerService from '../../services/ledgerService';
import { pharmacyService } from '../../services/pharmacyService';
import { purchaseService } from '../../services/purchaseService';
import { useHasPerm } from '../../context/AuthContext';

export default function Ledger() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({ account: '', type: '', from: '', to: '' });
  const [accountQuery, setAccountQuery] = useState('');
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const canCreateAccount = useHasPerm('ledger:create', ['ADMIN', 'SUPER_ADMIN']);
  const canCreateManual = useHasPerm('ledger:create');

  // Manual entry state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDebitAccount, setManualDebitAccount] = useState('');
  const [manualCreditAccount, setManualCreditAccount] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualMode, setManualMode] = useState('JOURNAL'); // JOURNAL | PURCHASE | RETURN
  const [supplierName, setSupplierName] = useState('');
  const [itemsList, setItemsList] = useState([]); // {productId?, name, quantity, unitPrice, gstPercent}
  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  // Autocomplete helpers
  const [debitQuery, setDebitQuery] = useState('');
  const [debitOptions, setDebitOptions] = useState([]);
  const [debitSelected, setDebitSelected] = useState(null);
  const [creditQuery, setCreditQuery] = useState('');
  const [creditOptions, setCreditOptions] = useState([]);
  const [creditSelected, setCreditSelected] = useState(null);

  // Fetch account options for debit/credit queries
  useEffect(() => {
    if (!debitQuery) {
      setDebitOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await ledgerService.getAccounts(debitQuery);
        const list = r.data?.data || [];
        setDebitOptions(list);
      } catch (e) {
        setDebitOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [debitQuery]);

  useEffect(() => {
    if (!creditQuery) {
      setCreditOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await ledgerService.getAccounts(creditQuery);
        const list = r.data?.data || [];
        setCreditOptions(list);
      } catch (e) {
        setCreditOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [creditQuery]);

  // product search for manual purchase/return
  useEffect(() => {
    if (!productQuery) return setProductOptions([]);
    const t = setTimeout(async () => {
      try {
        const r = await pharmacyService.getProducts({ search: productQuery, limit: 10 });
        const list = r?.data?.data || r?.data || [];
        setProductOptions(list);
      } catch (e) {
        setProductOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productQuery]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ledger', page, limit, filters],
    queryFn: () => ledgerService.getEntries({ page, limit, ...filters }),
    keepPreviousData: true,
  });

  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['ledgerSummary', filters],
    queryFn: () => ledgerService.getSummary(filters),
  });

  // `data` is the axios response object; unwrap to get payload `{ success, data, pagination }`
  const resp = data?.data;
  const items = resp?.data || [];
  const pagination = resp?.pagination || { page: 1, limit, total: 0, totalPages: 0 };

  const handleFilterChange = (k, v) => setFilters((s) => ({ ...s, [k]: v }));

  const applyFilters = () => {
    setPage(1);
    refetch();
    refetchSummary();
  };

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const canReturn = useHasPerm('purchases:update', ['PHARMACIST', 'ADMIN', 'SUPER_ADMIN']);

  // Return form state
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnMap, setReturnMap] = useState({}); // { purchaseItemId: { qty: string, gstAmount: string } }

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const r = await ledgerService.getDetail(id);
      const d = r.data?.data || null;
      setDetail(d);
      setShowReturnForm(false);
      setReturnMap({});
    } catch (err) {
      console.error('Failed to load detail', err);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openReturn = () => {
    if (!detail?.purchase) return;
    const map = {};
    detail.purchase.items.forEach((it) => { map[it.id] = { qty: '', gstAmount: String(it.taxAmount ? (it.taxAmount / (it.quantity || 1)) * 1 : 0) }; });
    setReturnMap(map);
    setShowReturnForm(true);
  };

  const setReturnQty = (itemId, qty) => {
    setReturnMap((m) => ({ ...m, [itemId]: { ...(m[itemId] || {}), qty: qty } }));
  };

  const setReturnGst = (itemId, gst) => {
    setReturnMap((m) => ({ ...m, [itemId]: { ...(m[itemId] || {}), gstAmount: gst } }));
  };

  const submitReturn = async () => {
    if (!detail?.purchase) return;
    const payloadItems = Object.entries(returnMap).map(([purchaseItemId, obj]) => ({ purchaseItemId, quantity: Number(obj.qty || 0), gstAmount: obj.gstAmount ? Number(obj.gstAmount) : undefined })).filter(it => it.quantity > 0);
    if (payloadItems.length === 0) return alert('Select at least one item with quantity > 0');
    try {
      await purchaseService.returnPurchase(detail.purchase.id, { items: payloadItems, note: 'Return created from ledger UI' });
      setShowReturnForm(false);
      setDetailOpen(false);
      setPage(1);
      await refetch();
      await refetchSummary();
      alert('Return processed');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to process return');
    }
  };

  // compute return totals for display
  const returnTotals = React.useMemo(() => {
    if (!detail?.purchase) return { items: 0, tax: 0, total: 0 };
    let itemsTotal = 0;
    let taxTotal = 0;
    detail.purchase.items.forEach((it) => {
      const entry = returnMap[it.id];
      const qty = Number(entry?.qty || 0);
      if (qty <= 0) return;
      const base = Number(it.unitPrice || 0) * qty;
      const taxPerUnit = (Number(it.taxAmount || 0) / (it.quantity || 1));
      const gst = entry && entry.gstAmount !== undefined && entry.gstAmount !== '' ? Number(entry.gstAmount || 0) : taxPerUnit * qty;
      itemsTotal += base;
      taxTotal += gst;
    });
    return { items: itemsTotal, tax: taxTotal, total: itemsTotal + taxTotal };
  }, [detail, returnMap]);

  // Accounts search
  const { data: accountsResp, refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts', accountQuery],
    queryFn: () => ledgerService.getAccounts(accountQuery),
    enabled: !!accountQuery,
    keepPreviousData: true,
  });
  const accounts = accountsResp?.data?.data || [];

  useEffect(() => {
    if (!accountQuery) return;
    const t = setTimeout(() => refetchAccounts(), 300);
    return () => clearTimeout(t);
  }, [accountQuery, refetchAccounts]);

  const handleCreateAccount = async () => {
    if (!newAccountName || !newAccountName.trim()) return;
    try {
      await ledgerService.createAccount({ name: newAccountName.trim() });
      setShowCreateAccount(false);
      setNewAccountName('');
      setAccountQuery('');
      refetchAccounts();
      setFilters((s) => ({ ...s, account: newAccountName.trim() }));
      refetch();
      refetchSummary();
    } catch (err) {
      console.error('Create account failed', err);
      alert(err.response?.data?.message || 'Failed to create account');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
            <p className="text-gray-500 mt-1">Account ledger entries</p>
          </div>
          <div>
            {canCreateManual && (
              <button onClick={() => setShowManualModal(true)} className="px-3 py-2 bg-green-600 text-white rounded">Add Manual Entry</button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <input type="text" placeholder="Account (search or create)" value={filters.account} onChange={(e) => { handleFilterChange('account', e.target.value); setAccountQuery(e.target.value); }} className="p-2 border rounded w-full" />
              {accountQuery && (
                <div className="absolute z-20 bg-white border rounded mt-1 w-full max-h-48 overflow-auto">
                  {(accounts.length === 0) ? (
                    <div className="p-2 text-sm text-gray-500">No accounts. {canCreateAccount && <button onClick={() => setShowCreateAccount(true)} className="text-blue-600 underline">Create</button>}</div>
                  ) : (
                    accounts.map((a) => (
                      <div key={a.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setFilters((s) => ({ ...s, account: a.name })); setAccountQuery(''); }}>
                        {a.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="p-2 border rounded">
              <option value="">All Types</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
            <input type="date" value={filters.from} onChange={(e) => handleFilterChange('from', e.target.value)} className="p-2 border rounded" />
            <input type="date" value={filters.to} onChange={(e) => handleFilterChange('to', e.target.value)} className="p-2 border rounded" />
            <div className="flex gap-2">
              <button onClick={applyFilters} className="px-3 py-2 bg-blue-600 text-white rounded">Apply</button>
              <button onClick={() => { setFilters({ account: '', type: '', from: '', to: '' }); setPage(1); refetch(); }} className="px-3 py-2 bg-gray-100 rounded">Reset</button>
            </div>
          </div>
        </div>
          {/* Detail modal */}
          {detailOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg w-full max-w-3xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Ledger Entry Detail</h3>
                  <button onClick={() => setDetailOpen(false)} className="text-gray-600">Close</button>
                </div>
                {detailLoading ? (
                  <div className="py-8 text-center text-gray-500">Loading…</div>
                ) : !detail ? (
                  <div className="py-8 text-center text-gray-500">No details available</div>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500">Account</div>
                        <div className="font-medium">{detail.entry.account}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Amount</div>
                        <div className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(detail.entry.amount)}</div>
                      </div>
                    </div>

                    {detail.purchase && (
                      <div className="mb-4">
                        <h4 className="font-semibold">Purchase: {detail.purchase.invoiceNo}</h4>
                        <div className="text-sm text-gray-600">Supplier: {detail.purchase.supplier?.name || '—'}</div>
                        <div className="mt-2 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500">
                              <tr><th className="text-left">Item</th><th>Qty</th><th>Rate</th><th className="text-right">Amount</th></tr>
                            </thead>
                            <tbody>
                              {detail.purchase.items.map((it) => (
                                <tr key={it.id} className="border-t"><td>{it.name}</td><td className="text-center">{it.quantity}</td><td className="text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(it.unitPrice)}</td><td className="text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(it.amount)}</td></tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t"><td colSpan={3} className="text-right text-sm text-gray-600">Subtotal</td><td className="text-right font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(detail.purchase.subtotal)}</td></tr>
                          {canReturn && (
                            <div className="mt-4">
                              <button onClick={openReturn} className="px-3 py-1 bg-yellow-500 text-white rounded">Create Return</button>
                            </div>
                          )}
                          {showReturnForm && (
                            <div className="mt-4 bg-gray-50 p-3 rounded">
                              <h5 className="font-semibold">Return Items</h5>
                              <div className="mt-2">
                                {detail.purchase.items.map((it) => (
                                  <div key={it.id} className="flex items-center gap-3 py-2 border-b">
                                    <div className="flex-1">{it.name} <span className="text-xs text-gray-500">(available {it.quantity})</span></div>
                                    <div className="w-24"><input type="number" min={0} max={it.quantity} value={(returnMap[it.id]?.qty ?? '')} onChange={(e) => setReturnQty(it.id, e.target.value)} className="p-1 border rounded w-full" /></div>
                                    <div className="w-28 text-xs text-gray-600">GST amt</div>
                                    <div className="w-28"><input type="number" min={0} step="0.01" value={(returnMap[it.id]?.gstAmount ?? '')} onChange={(e) => setReturnGst(it.id, e.target.value)} className="p-1 border rounded w-full" /></div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3">
                                <div className="text-right text-sm text-gray-700">Items: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(returnTotals.items)} • GST: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(returnTotals.tax)} • Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(returnTotals.total)}</div>
                                <div className="mt-2 flex justify-end gap-2">
                                  <button onClick={() => setShowReturnForm(false)} className="px-3 py-1 border rounded">Cancel</button>
                                  <button onClick={submitReturn} className="px-3 py-1 bg-red-600 text-white rounded">Submit Return</button>
                                </div>
                              </div>
                            </div>
                          )}
                              <tr><td colSpan={3} className="text-right text-sm text-gray-600">Tax</td><td className="text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(detail.purchase.taxAmount)}</td></tr>
                              <tr><td colSpan={3} className="text-right text-sm text-gray-600">Total</td><td className="text-right font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(detail.purchase.totalAmount)}</td></tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {detail.relatedEntries && detail.relatedEntries.length > 0 && (
                      <div>
                        <h4 className="font-semibold">Related Payments / Adjustments</h4>
                        <div className="mt-2 text-sm">
                          <table className="w-full">
                            <thead className="text-xs text-gray-500"><tr><th>Date</th><th>Account</th><th>Type</th><th className="text-right">Amount</th><th>Note</th></tr></thead>
                            <tbody>
                              {detail.relatedEntries.map((r) => (
                                <tr key={r.id} className="border-t"><td className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</td><td>{r.account}</td><td>{r.type}</td><td className="text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(r.amount)}</td><td className="text-sm text-gray-600">{r.note || '-'}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700">Account Balances</h3>
              {summaryLoading ? (
                <div className="mt-3 text-gray-500">Loading balances…</div>
              ) : (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(summaryData?.data?.data?.accounts || []).map((a) => (
                    <div key={a.account} className="p-3 bg-gray-50 rounded">
                      <div className="text-xs text-gray-500">{a.account}</div>
                      <div className="text-lg font-medium text-gray-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(a.balance)}</div>
                      <div className="text-xs text-gray-500">Debit: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(a.debit)} • Credit: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(a.credit)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Create account modal (simple) */}
          {showCreateAccount && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded p-4 w-full max-w-md">
                <h3 className="text-lg font-semibold">Create Account</h3>
                <input className="mt-3 p-2 border w-full" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Account name" />
                <div className="mt-4 flex justify-end gap-2">
                  <button className="px-3 py-1 border rounded" onClick={() => setShowCreateAccount(false)}>Cancel</button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleCreateAccount}>Create</button>
                </div>
              </div>
            </div>
          )}

          {/* Manual entry modal */}
          {showManualModal && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded p-4 w-full max-w-md">
                <h3 className="text-lg font-semibold">Create Manual Ledger Entry</h3>
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Debit account</div>
                                      <div className="mt-3">
                                        <div className="text-xs text-gray-500 mb-1">Mode</div>
                                        <select value={manualMode} onChange={(e) => setManualMode(e.target.value)} className="p-2 border rounded w-full">
                                          <option value="JOURNAL">Journal (debit/credit)</option>
                                          <option value="PURCHASE">Manual Purchase (add stock)</option>
                                          <option value="RETURN">Manual Return (reduce stock)</option>
                                        </select>
                                      </div>

                                      {manualMode !== 'JOURNAL' && (
                                        <>
                                          <div className="mt-3">
                                            <div className="text-xs text-gray-500 mb-1">Supplier / Distributor</div>
                                            <input className="w-full p-2 border rounded" placeholder="Supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
                                          </div>

                                          <div className="mt-3">
                                            <div className="text-xs text-gray-500 mb-1">Add product</div>
                                            <input className="w-full p-2 border rounded" placeholder="Search medicine" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
                                            {productOptions.length > 0 && productQuery && (
                                              <div className="border bg-white max-h-44 overflow-auto mt-1">
                                                {productOptions.map(p => (
                                                  <div key={p.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => {
                                                    // add product to items list
                                                    setItemsList((s) => [...s, { productId: p.id, name: p.name, quantity: 1, unitPrice: p.purchasePrice || p.mrp || 0, gstPercent: p.gstPercent || 0 }]);
                                                    setProductQuery(''); setProductOptions([]);
                                                  }}>{p.name} — {p.code || ''}</div>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          <div className="mt-3">
                                            <div className="text-xs text-gray-500 mb-1">Items</div>
                                            <div className="space-y-2">
                                              {itemsList.map((it, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                  <div className="flex-1">{it.name}</div>
                                                  <input type="number" min={1} className="w-20 p-1 border rounded" value={it.quantity} onChange={(e) => setItemsList((s) => s.map((x,i) => i===idx?{...x,quantity: Number(e.target.value)}:x))} />
                                                  <input type="number" step="0.01" className="w-28 p-1 border rounded" value={it.unitPrice} onChange={(e) => setItemsList((s) => s.map((x,i) => i===idx?{...x,unitPrice: Number(e.target.value)}:x))} />
                                                  <input type="number" step="0.01" className="w-20 p-1 border rounded" value={it.gstPercent} onChange={(e) => setItemsList((s) => s.map((x,i) => i===idx?{...x,gstPercent: Number(e.target.value)}:x))} />
                                                  <button className="px-2 py-1 text-sm bg-red-100 rounded" onClick={() => setItemsList((s) => s.filter((_,i) => i!==idx))}>Remove</button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      )}
                    <input className="w-full p-2 border rounded" placeholder="Search debit account" value={debitQuery || manualDebitAccount} onChange={(e) => { setDebitQuery(e.target.value); setManualDebitAccount(e.target.value); setDebitSelected(null); }} />
                    {debitOptions.length > 0 && debitQuery && (
                      <div className="border bg-white max-h-44 overflow-auto mt-1">
                        {debitOptions.map(a => (
                          <div key={a.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setDebitSelected(a); setDebitQuery(a.name); setManualDebitAccount(a.name); setDebitOptions([]); }}>{a.name}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">Credit account</div>
                    <input className="w-full p-2 border rounded" placeholder="Search credit account" value={creditQuery || manualCreditAccount} onChange={(e) => { setCreditQuery(e.target.value); setManualCreditAccount(e.target.value); setCreditSelected(null); }} />
                    {creditOptions.length > 0 && creditQuery && (
                      <div className="border bg-white max-h-44 overflow-auto mt-1">
                        {creditOptions.map(a => (
                          <div key={a.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={() => { setCreditSelected(a); setCreditQuery(a.name); setManualCreditAccount(a.name); setCreditOptions([]); }}>{a.name}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <input className="w-full p-2 border rounded" placeholder="Amount" type="number" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
                  <input className="w-full p-2 border rounded" placeholder="Date (optional)" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                  <textarea className="w-full p-2 border rounded" placeholder="Note (optional)" value={manualNote} onChange={(e) => setManualNote(e.target.value)} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="px-3 py-1 border rounded" onClick={() => setShowManualModal(false)}>Cancel</button>
                  <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={async () => {
                    try {
                      if (manualMode === 'JOURNAL') {
                        if ((!debitSelected && !manualDebitAccount) || (!creditSelected && !manualCreditAccount) || !manualAmount) return alert('Provide debit, credit and amount');
                        // Ensure accounts exist: if selected use id, otherwise create
                        let debitId = debitSelected?.id;
                        let creditId = creditSelected?.id;
                        if (!debitId) {
                          const created = await ledgerService.createAccount({ name: manualDebitAccount.trim() });
                          debitId = created.data?.data?.id || created.data?.id || created.data?.data?.id;
                        }
                        if (!creditId) {
                          const created = await ledgerService.createAccount({ name: manualCreditAccount.trim() });
                          creditId = created.data?.data?.id || created.data?.id || created.data?.data?.id;
                        }
                        await ledgerService.createManualEntry({ debitAccountId: debitId, creditAccountId: creditId, amount: Number(manualAmount), note: manualNote || undefined, date: manualDate || undefined });
                      } else {
                        if (itemsList.length === 0) return alert('Add at least one item');
                        // submit manual purchase/return
                        await ledgerService.createManualPurchase({ mode: manualMode, supplierName: supplierName || undefined, items: itemsList, note: manualNote || undefined, date: manualDate || undefined });
                      }

                      setShowManualModal(false);
                      setManualDebitAccount(''); setManualCreditAccount(''); setManualAmount(''); setManualNote(''); setManualDate('');
                      setDebitQuery(''); setDebitOptions([]); setDebitSelected(null);
                      setCreditQuery(''); setCreditOptions([]); setCreditSelected(null);
                      // clear purchase fields
                      setSupplierName(''); setItemsList([]);
                      setPage(1);
                      await refetch();
                      await refetchSummary();
                      alert('Manual entry created');
                    } catch (err) {
                      console.error('Manual entry failed', err);
                      alert(err?.response?.data?.message || 'Failed to create manual entry');
                    }
                  }}>Create</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-gray-500">No ledger entries found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Ref</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it) => (
                      <tr key={it.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(it.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{it.account}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(it.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.refType} {it.refId || ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{it.notes || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <button onClick={() => openDetail(it.id)} className="px-2 py-1 text-sm bg-gray-100 rounded">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Showing page {pagination.page} of {pagination.totalPages} — {pagination.total} entries</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                  <button onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))} disabled={page === (pagination.totalPages || 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

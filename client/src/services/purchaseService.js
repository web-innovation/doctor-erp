import api from './api';

export const purchaseService = {
  uploadInvoice: (formData, config = {}) => api.post('/purchases/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }, ...config }),
  getUpload: (id) => api.get(`/purchases/upload/${id}`),
  cancelUpload: (id) => api.post(`/purchases/upload/${id}/cancel`),
  createFromUpload: (id, body) => api.post(`/purchases/from-upload/${id}`, body),
  receivePurchase: (id) => api.post(`/purchases/${id}/receive`),
  returnPurchase: (id, body) => api.post(`/purchases/${id}/return`, body),
  getSuppliers: (q) => api.get(`/purchases/suppliers?q=${encodeURIComponent(q || '')}`).then(r => (r?.data?.data || r?.data || r)),
  createSupplier: (body) => api.post('/purchases/suppliers', body).then(r => (r?.data?.data || r?.data || r)),
  getSupplier: (id) => api.get(`/purchases/suppliers/${id}`).then(r => (r?.data?.data || r?.data || r)),
  updateSupplier: (id, body) => api.put(`/purchases/suppliers/${id}`, body).then(r => (r?.data?.data || r?.data || r)),
  deleteSupplier: (id) => api.delete(`/purchases/suppliers/${id}`).then(r => (r?.data || r)),
  createManualPurchase: (body) => api.post('/ledger/manual-purchase', body),
  getPurchases: (params = {}) => api.get('/purchases', { params }),
  getPurchase: (id) => api.get(`/purchases/${id}`),
  updatePurchase: (id, body) => api.patch(`/purchases/${id}`, body),
  deletePurchase: (id) => api.delete(`/purchases/${id}`).then(r => (r?.data || r)),
  getSupplier: (id) => api.get(`/purchases/suppliers/${id}`),
};

import api from './api';

export const purchaseService = {
  uploadInvoice: (formData) => api.post('/purchases/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getUpload: (id) => api.get(`/purchases/upload/${id}`),
  createFromUpload: (id, body) => api.post(`/purchases/from-upload/${id}`, body),
  receivePurchase: (id) => api.post(`/purchases/${id}/receive`),
  returnPurchase: (id, body) => api.post(`/purchases/${id}/return`, body),
  getSuppliers: (q) => api.get(`/purchases/suppliers?q=${encodeURIComponent(q || '')}`),
  createSupplier: (body) => api.post('/purchases/suppliers', body),
};

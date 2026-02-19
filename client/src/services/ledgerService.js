import api from './api';

const ledgerService = {
  getEntries: (params = {}) => api.get('/ledger', { params }),
  getSummary: (params = {}) => api.get('/ledger/summary', { params }),
  getAccounts: (q) => api.get('/accounts', { params: { q } }),
  createAccount: (payload) => api.post('/accounts', payload),
  getDetail: (id) => api.get(`/ledger/${id}`),
  createManualEntry: (payload) => api.post('/ledger/manual', payload),
  createManualPurchase: (payload) => api.post('/ledger/manual/purchase', payload),
};

export default ledgerService;

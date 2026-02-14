import api from './api';

const labsAgentsService = {
  // Labs CRUD operations
  getLabs: async (params = {}) => {
    const response = await api.get('/labs-agents/labs', { params });
    return response.data;
  },

  getLabById: async (id) => {
    const response = await api.get(`/labs-agents/labs/${id}`);
    return response.data;
  },

  createLab: async (data) => {
    const response = await api.post('/labs-agents/labs', data);
    return response.data;
  },

  updateLab: async (id, data) => {
    const response = await api.put(`/labs-agents/labs/${id}`, data);
    return response.data;
  },

  deleteLab: async (id) => {
    const response = await api.delete(`/labs-agents/labs/${id}`);
    return response.data;
  },

  // Agents CRUD operations
  getAgents: async (params = {}) => {
    const response = await api.get('/labs-agents/agents', { params });
    return response.data;
  },

  getAgentById: async (id) => {
    const response = await api.get(`/labs-agents/agents/${id}`);
    return response.data;
  },

  createAgent: async (data) => {
    const response = await api.post('/labs-agents/agents', data);
    return response.data;
  },

  updateAgent: async (id, data) => {
    const response = await api.put(`/labs-agents/agents/${id}`, data);
    return response.data;
  },

  deleteAgent: async (id) => {
    const response = await api.delete(`/labs-agents/agents/${id}`);
    return response.data;
  },

  // Commission operations
  getCommissions: async (params = {}) => {
    const response = await api.get('/labs-agents/commissions', { params });
    return response.data;
  },

  getCommissionById: async (id) => {
    const response = await api.get(`/labs-agents/commissions/${id}`);
    return response.data;
  },

  createCommission: async (data) => {
    const response = await api.post('/labs-agents/commissions', data);
    return response.data;
  },

  updateCommission: async (id, data) => {
    const response = await api.put(`/labs-agents/commissions/${id}`, data);
    return response.data;
  },

  markCommissionPaid: async (id, paymentData) => {
    const response = await api.patch(`/labs-agents/commissions/${id}/pay`, paymentData);
    return response.data;
  },

  getCommissionSummary: async (params = {}) => {
    const response = await api.get('/labs-agents/commissions/summary', { params });
    return response.data;
  },

  // Lab test catalog operations
  getLabTests: async (labId, params = {}) => {
    const response = await api.get(`/labs-agents/labs/${labId}/tests`, { params });
    return response.data;
  },

  createLabTest: async (labId, data) => {
    const response = await api.post(`/labs-agents/labs/${labId}/tests`, data);
    return response.data;
  },

  updateLabTest: async (labId, testId, data) => {
    const response = await api.put(`/labs-agents/labs/${labId}/tests/${testId}`, data);
    return response.data;
  },

  deleteLabTest: async (labId, testId) => {
    const response = await api.delete(`/labs-agents/labs/${labId}/tests/${testId}`);
    return response.data;
  },
};

export { labsAgentsService };
export default labsAgentsService;

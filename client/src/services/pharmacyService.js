import api from './api';

const pharmacyService = {
  /**
   * Get list of pharmacy products with search and pagination
   * @param {Object} params - Query parameters
   * @param {string} [params.search] - Search term for name or SKU
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.category] - Filter by category
   * @param {string} [params.type] - Filter by type (medicine, supply, equipment)
   * @param {boolean} [params.lowStock] - Filter only low stock items
   * @param {string} [params.sortBy] - Sort field
   * @param {string} [params.sortOrder] - Sort order (asc/desc)
   * @returns {Promise} - Paginated product list
   */
  getProducts: async (params = {}) => {
    const response = await api.get('/pharmacy/products', { params });
    return response.data;
  },

  /**
   * Get single product by ID
   * @param {string} id - Product ID
   * @returns {Promise} - Product data
   */
  getProduct: async (id) => {
    const response = await api.get(`/pharmacy/products/${id}`);
    return response.data;
  },

  /**
   * Create new product
   * @param {Object} data - Product data
   * @param {string} data.name - Product name
   * @param {string} [data.sku] - Stock keeping unit
   * @param {string} [data.category] - Product category
   * @param {string} [data.type] - Product type
   * @param {string} [data.description] - Product description
   * @param {number} data.price - Selling price
   * @param {number} [data.costPrice] - Cost price
   * @param {number} [data.stock=0] - Initial stock quantity
   * @param {number} [data.minStock] - Minimum stock threshold
   * @param {string} [data.unit] - Unit of measurement
   * @param {string} [data.manufacturer] - Manufacturer name
   * @param {string} [data.expiryDate] - Expiry date
   * @param {boolean} [data.requiresPrescription] - Requires prescription flag
   * @returns {Promise} - Created product data
   */
  createProduct: async (data) => {
    const response = await api.post('/pharmacy/products', data);
    return response.data;
  },

  /**
   * Update product
   * @param {string} id - Product ID
   * @param {Object} data - Product data to update
   * @returns {Promise} - Updated product data
   */
  updateProduct: async (id, data) => {
    const response = await api.put(`/pharmacy/products/${id}`, data);
    return response.data;
  },

  /**
   * Update product stock
   * @param {string} id - Product ID
   * @param {number} quantity - Quantity to add/subtract
   * @param {string} type - Transaction type (addition, subtraction, adjustment, sale, return)
   * @param {string} [notes] - Notes for the transaction
   * @returns {Promise} - Updated product data with new stock
   */
  updateStock: async (id, payload) => {
    const body = {
      quantity: payload.quantity,
      type: payload.type,
      notes: payload.notes,
    };
    if (payload.expiryDate) body.expiryDate = payload.expiryDate;
    if (payload.batchNumber) body.batchNumber = payload.batchNumber;
    if (payload.costPrice) body.costPrice = payload.costPrice;
    const response = await api.post(`/pharmacy/products/${id}/stock`, body);
    return response.data;
  },

  /**
   * Get low stock products
   * @param {number} [threshold] - Custom threshold (uses product's minStock if not provided)
   * @returns {Promise} - List of low stock products
   */
  getLowStock: async (threshold = null) => {
    const params = threshold ? { threshold } : {};
    const response = await api.get('/pharmacy/low-stock', { params });
    return response.data;
  },

  /**
   * Get stock history/transactions
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.productId] - Filter by product
   * @param {string} [params.type] - Filter by transaction type
   * @param {string} [params.startDate] - Filter from date
   * @param {string} [params.endDate] - Filter to date
   * @returns {Promise} - Paginated stock history
   */
  getStockHistory: async (params = {}) => {
    const response = await api.get('/pharmacy/stock-history', { params });
    return response.data;
  },
};

export { pharmacyService };
export default pharmacyService;

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaExclamationTriangle,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaBoxOpen,
  FaTimes,
} from 'react-icons/fa';
import pharmacyService from '../../services/pharmacyService';
import { useAuth, useHasPerm } from '../../context/AuthContext';
import settingsService from '../../services/settingsService';
import Modal from '../../components/common/Modal';

const TABS = [
  { id: 'all', label: 'All Products' },
  { id: 'lowStock', label: 'Low Stock' },
  { id: 'expiring', label: 'Expiring Soon' },
];

export default function Pharmacy() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      sku: '',
      genericName: '',
      category: '',
      unit: 'units',
      price: '',
      costPrice: '',
      stock: '0',
      minStock: '10',
      expiryDate: '',
    },
  });

  const {
    register: registerStock,
    handleSubmit: handleStockSubmit,
    reset: resetStock,
  } = useForm({
    defaultValues: {
      type: 'addition',
      quantity: '',
      notes: '',
      expiryDate: '',
      batchNumber: '',
    },
  });

  // Fetch products based on active tab
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', activeTab, currentPage, pageSize, searchQuery],
    queryFn: () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
      };
      
      if (activeTab === 'lowStock') {
        params.stockStatus = 'low';
      } else if (activeTab === 'expiring') {
        // Get products expiring within 30 days
        params.expiringWithin = 30;
      }
      
      return pharmacyService.getProducts(params);
    },
    placeholderData: (previousData) => previousData,
  });

  const products = productsData?.data || [];
  const totalPages = productsData?.pagination?.totalPages || 1;
  const totalCount = productsData?.pagination?.total || 0;

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: (data) => pharmacyService.createProduct(data),
    onSuccess: () => {
      toast.success('Product added successfully');
      queryClient.invalidateQueries(['products']);
      setIsAddModalOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add product');
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => pharmacyService.updateProduct(id, data),
    onSuccess: () => {
      toast.success('Product updated successfully');
      queryClient.invalidateQueries(['products']);
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: (payload) => pharmacyService.updateStock(payload.id, payload),
    onSuccess: () => {
      toast.success('Stock updated successfully');
      queryClient.invalidateQueries(['products']);
      setIsStockModalOpen(false);
      setSelectedProduct(null);
      resetStock();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => pharmacyService.updateProduct(id, { isActive: false }),
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries(['products']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    },
  });

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const onAddProduct = (data) => {
    createMutation.mutate({
      code: data.sku || undefined,
      name: data.name,
      genericName: data.genericName,
      category: data.category,
      mrp: parseFloat(data.price),
      sellingPrice: parseFloat(data.price),
      purchasePrice: data.costPrice ? parseFloat(data.costPrice) : undefined,
      quantity: parseInt(data.stock) || 0,
      minStock: data.minStock ? parseInt(data.minStock) : 10,
      unit: data.unit || 'pcs',
      expiryDate: data.expiryDate || undefined,
    });
  };

  const onEditProduct = (data) => {
    if (!selectedProduct) return;
    updateMutation.mutate({
      id: selectedProduct.id,
      data: {
        name: data.name,
        genericName: data.genericName,
        category: data.category,
        mrp: parseFloat(data.price),
        sellingPrice: parseFloat(data.price),
        purchasePrice: data.costPrice ? parseFloat(data.costPrice) : undefined,
        minStock: data.minStock ? parseInt(data.minStock) : 10,
        unit: data.unit || 'pcs',
        expiryDate: data.expiryDate || undefined,
      },
    });
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setValue('name', product.name);
    setValue('sku', product.code);
    setValue('genericName', product.genericName || '');
    setValue('category', product.category || '');
    setValue('price', product.sellingPrice || product.mrp || '');
    setValue('costPrice', product.purchasePrice || '');
    setValue('minStock', product.minStock || 10);
    setValue('unit', product.unit || 'pcs');
    setValue('expiryDate', product.expiryDate ? product.expiryDate.split('T')[0] : '');
    setIsEditModalOpen(true);
  };

  const onUpdateStock = (data) => {
    if (!selectedProduct) return;
    
    // Map frontend type to backend type
    const typeMap = {
      'addition': 'PURCHASE',
      'subtraction': 'SALE',
      'adjustment': 'ADJUSTMENT',
    };
    
    updateStockMutation.mutate({
      id: selectedProduct.id,
      quantity: parseInt(data.quantity),
      type: typeMap[data.type] || 'ADJUSTMENT',
      notes: data.notes,
      expiryDate: data.expiryDate || undefined,
      batchNumber: data.batchNumber || undefined,
    });
  };

  const openStockModal = (product) => {
    setSelectedProduct(product);
    resetStock({ type: 'addition', quantity: '', notes: '' });
    setIsStockModalOpen(true);
  };

  const handleDelete = (product) => {
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const isLowStock = (product) => {
    return product.quantity < (product.minStock || 10);
  };

  const isExpiringSoon = (product) => {
    if (!product.expiryDate) return false;
    const expiryDate = new Date(product.expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
            <p className="text-gray-500 mt-1">
              Manage inventory and stock levels
            </p>
          </div>
          {useHasPerm('pharmacy:create', ['SUPER_ADMIN', 'DOCTOR', 'PHARMACIST']) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <FaPlus />
              Add Product
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {tab.id === 'lowStock' && (
                  <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                    !
                  </span>
                )}
                {tab.id === 'expiring' && (
                  <span className="ml-2 bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full text-xs">
                    <FaClock className="inline w-3 h-3" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by product name or code..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FaBoxOpen className="text-4xl mb-4" />
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Add your first product to get started'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        MRP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Expiry
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-600">
                            {product.code || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {product.name}
                            </p>
                            {product.category && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {product.category}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isLowStock(product)
                                  ? 'text-red-600'
                                  : 'text-gray-900'
                              }`}
                            >
                              {product.quantity} {product.unit || 'units'}
                            </span>
                            {isLowStock(product) && (
                              <FaExclamationTriangle className="text-red-500 text-xs" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {formatCurrency(product.sellingPrice || product.mrp)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm ${
                              isExpiringSoon(product)
                                ? 'text-yellow-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {formatDate(product.expiryDate)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openStockModal(product)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition"
                            >
                              <FaPlus className="text-xs" />
                              Stock
                            </button>
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> products
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    <FaChevronLeft className="text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    <FaChevronRight className="text-gray-600" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          reset();
        }}
        title="Add New Product"
        size="lg"
      >
        <form onSubmit={handleSubmit(onAddProduct)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name', { required: 'Product name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU / Code
              </label>
              <input
                {...register('sku')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter SKU or product code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generic Name
              </label>
              <input
                {...register('genericName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter generic name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="Tablets">Tablets</option>
                <option value="Capsules">Capsules</option>
                <option value="Syrups">Syrups</option>
                <option value="Injections">Injections</option>
                <option value="Drops">Drops</option>
                <option value="Ointments">Ointments</option>
                <option value="Supplies">Supplies</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                {...register('unit')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="units">Units</option>
                <option value="strips">Strips</option>
                <option value="bottles">Bottles</option>
                <option value="boxes">Boxes</option>
                <option value="packs">Packs</option>
                <option value="ml">ML</option>
                <option value="gm">GM</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MRP (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('price', { required: 'MRP is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('costPrice')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                {...register('stock')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                defaultValue={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                {...register('minStock')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                {...register('manufacturer')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter manufacturer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                {...register('expiryDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('requiresPrescription')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Requires Prescription
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                reset();
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Stock Update Modal */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setSelectedProduct(null);
          resetStock();
        }}
        title="Update Stock"
        size="md"
      >
        {selectedProduct && (
          <form onSubmit={handleStockSubmit(onUpdateStock)} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{selectedProduct.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                Current Stock:{' '}
                <span className="font-medium">
                  {selectedProduct.quantity} {selectedProduct.unit || 'units'}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type <span className="text-red-500">*</span>
              </label>
              <select
                {...registerStock('type', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="addition">Add Stock</option>
                <option value="subtraction">Remove Stock</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...registerStock('quantity', { required: true, min: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Number
              </label>
              <input
                {...registerStock('batchNumber')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional batch number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                {...registerStock('expiryDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...registerStock('notes')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional notes for this transaction"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsStockModalOpen(false);
                  setSelectedProduct(null);
                  resetStock();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateStockMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {updateStockMutation.isPending ? 'Updating...' : 'Update Stock'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProduct(null);
          reset();
        }}
        title="Edit Product"
        size="lg"
      >
        <form onSubmit={handleSubmit(onEditProduct)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name', { required: 'Product name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU / Code
              </label>
              <input
                {...register('sku')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                placeholder="SKU"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generic Name
              </label>
              <input
                {...register('genericName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter generic name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="Tablets">Tablets</option>
                <option value="Capsules">Capsules</option>
                <option value="Syrups">Syrups</option>
                <option value="Injections">Injections</option>
                <option value="Drops">Drops</option>
                <option value="Ointments">Ointments</option>
                <option value="Supplies">Supplies</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                {...register('unit')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="units">Units</option>
                <option value="strips">Strips</option>
                <option value="bottles">Bottles</option>
                <option value="boxes">Boxes</option>
                <option value="packs">Packs</option>
                <option value="ml">ML</option>
                <option value="gm">GM</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MRP (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('price', { required: 'MRP is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('costPrice')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                {...register('minStock')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                {...register('expiryDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedProduct(null);
                reset();
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

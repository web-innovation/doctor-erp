import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaSearch,
  FaPlus,
  FaTrash,
  FaUser,
  FaShoppingCart,
  FaPercent,
  FaRupeeSign,
  FaSave,
  FaPrint,
} from 'react-icons/fa';
import billingService from '../../services/billingService';
import { patientService } from '../../services/patientService';
import pharmacyService from '../../services/pharmacyService';

const BILL_TYPES = [
  { id: 'consultation', label: 'Consultation', color: 'blue' },
  { id: 'pharmacy', label: 'Pharmacy', color: 'green' },
  { id: 'lab', label: 'Lab Test', color: 'purple' },
];

const GST_RATES = [
  { value: 0, label: 'No GST (0%)' },
  { value: 5, label: 'GST 5%' },
  { value: 12, label: 'GST 12%' },
  { value: 18, label: 'GST 18%' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'netbanking', label: 'Net Banking' },
  { value: 'insurance', label: 'Insurance' },
];

export default function NewBill() {
  const navigate = useNavigate();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [billType, setBillType] = useState('consultation');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [collectPayment, setCollectPayment] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      items: [],
      discount: 0,
      discountType: 'fixed',
      gstRate: 0,
      paymentMethod: 'cash',
      paymentAmount: 0,
      paymentReference: '',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const watchDiscount = watch('discount') || 0;
  const watchDiscountType = watch('discountType');
  const watchGstRate = watch('gstRate') || 0;
  const watchPaymentAmount = watch('paymentAmount') || 0;

  // Fetch patients for search
  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', patientSearch],
    queryFn: () => patientService.getPatients({ search: patientSearch, limit: 5 }),
    enabled: patientSearch.length >= 2,
  });

  // Fetch pharmacy products for search
  const { data: productsData } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: () => pharmacyService.getProducts({ search: productSearch, limit: 10 }),
    enabled: productSearch.length >= 2 && billType === 'pharmacy',
  });

  const patients = patientsData?.data || [];
  const products = productsData?.data || [];

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = watchItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
    }, 0);

    let discountAmount = 0;
    if (watchDiscountType === 'percentage') {
      discountAmount = (subtotal * (parseFloat(watchDiscount) || 0)) / 100;
    } else {
      discountAmount = parseFloat(watchDiscount) || 0;
    }

    const afterDiscount = subtotal - discountAmount;
    const gstAmount = (afterDiscount * (parseFloat(watchGstRate) || 0)) / 100;
    const total = afterDiscount + gstAmount;

    return {
      subtotal,
      discountAmount,
      afterDiscount,
      gstAmount,
      total,
    };
  }, [watchItems, watchDiscount, watchDiscountType, watchGstRate]);

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: (data) => billingService.createBill(data),
    onSuccess: (data) => {
      toast.success('Bill created successfully');
      navigate(`/billing`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create bill');
    },
  });

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setShowPatientDropdown(false);
  };

  const handleProductSelect = (product) => {
    // Check if product already exists in items
    const existingIndex = watchItems.findIndex(
      (item) => item.productId === product.id
    );

    if (existingIndex >= 0) {
      // Increase quantity
      const newQuantity = (parseInt(watchItems[existingIndex].quantity) || 0) + 1;
      setValue(`items.${existingIndex}.quantity`, newQuantity);
      toast.success(`${product.name} quantity updated`);
    } else {
      // Add new item
      append({
        productId: product.id,
        description: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice || product.mrp || 0,
        type: 'medicine',
      });
      toast.success(`${product.name} added to bill`);
    }

    setProductSearch('');
    setShowProductDropdown(false);
  };

  const addManualItem = () => {
    append({
      productId: null,
      description: '',
      quantity: 1,
      unitPrice: 0,
      type: billType === 'consultation' ? 'consultation' : billType === 'lab' ? 'lab' : 'other',
    });
  };

  const onSubmit = (data) => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (data.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Map frontend bill type to backend enum
    const billTypeMap = {
      'pharmacy': 'PHARMACY',
      'consultation': 'CONSULTATION',
      'lab': 'LAB_TEST',
    };

    const billData = {
      patientId: selectedPatient.id,
      type: billTypeMap[billType] || 'MIXED',
      items: data.items.map((item) => ({
        description: item.description,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        gstPercent: parseFloat(data.gstRate) || 0,
        productId: item.productId || undefined,
      })),
      discount: calculations.discountAmount,
      discountType: 'AMOUNT',
      taxConfig: { gstRate: parseFloat(data.gstRate) || 0 },
      notes: data.notes,
    };

    // If collecting payment immediately
    if (collectPayment && parseFloat(data.paymentAmount) > 0) {
      billData.payment = {
        amount: parseFloat(data.paymentAmount),
        method: data.paymentMethod,
        reference: data.paymentReference,
      };
    }

    createBillMutation.mutate(billData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/billing')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FaArrowLeft className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Bill</h1>
            <p className="text-gray-500 mt-1">Create a new invoice</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Patient Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaUser className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Patient</h2>
                </div>

                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                      if (!e.target.value) setSelectedPatient(null);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Search patient by name or phone..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />

                  {/* Patient Dropdown */}
                  {showPatientDropdown && patients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {patients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => handlePatientSelect(patient)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-medium text-gray-900">{patient.name}</p>
                          <p className="text-sm text-gray-500">
                            {patient.phone} {patient.email && `• ${patient.email}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPatient && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-900">{selectedPatient.name}</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {selectedPatient.phone}
                      {selectedPatient.email && ` • ${selectedPatient.email}`}
                    </p>
                    {selectedPatient.patientId && (
                      <p className="text-xs text-blue-600 mt-1">
                        ID: {selectedPatient.patientId}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Type */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bill Type</h2>
                <div className="flex flex-wrap gap-3">
                  {BILL_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setBillType(type.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        billType === type.id
                          ? type.color === 'blue'
                            ? 'bg-blue-600 text-white'
                            : type.color === 'green'
                            ? 'bg-green-600 text-white'
                            : 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FaShoppingCart className="text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Items</h2>
                  </div>
                  <button
                    type="button"
                    onClick={addManualItem}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <FaPlus />
                    Add Item
                  </button>
                </div>

                {/* Product Search (for Pharmacy) */}
                {billType === 'pharmacy' && (
                  <div className="relative mb-4">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Search and add products..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />

                    {/* Product Dropdown */}
                    {showProductDropdown && products.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {products.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleProductSelect(product)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-500">
                                Stock: {product.quantity} {product.unit || 'units'}
                              </p>
                            </div>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(product.sellingPrice || product.mrp)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Items List */}
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FaShoppingCart className="text-3xl mx-auto mb-2 opacity-50" />
                    <p>No items added yet</p>
                    <p className="text-sm mt-1">
                      {billType === 'pharmacy'
                        ? 'Search and add products above'
                        : 'Click "Add Item" to add items'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Description
                            </label>
                            <input
                              {...register(`items.${index}.description`, {
                                required: true,
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Item description"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Qty
                            </label>
                            <input
                              type="number"
                              min="1"
                              {...register(`items.${index}.quantity`, {
                                required: true,
                                min: 1,
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Price (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              {...register(`items.${index}.unitPrice`, {
                                required: true,
                                min: 0,
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition mt-5"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount & GST */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaPercent className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Discount & GST
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type
                    </label>
                    <select
                      {...register('discountType')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fixed">Fixed Amount (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount {watchDiscountType === 'percentage' ? '(%)' : '(₹)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('discount')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Rate
                    </label>
                    <select
                      {...register('gstRate')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {GST_RATES.map((rate) => (
                        <option key={rate.value} value={rate.value}>
                          {rate.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Any additional notes for this bill..."
                />
              </div>
            </div>

            {/* Right Column - Summary & Payment */}
            <div className="space-y-6">
              {/* Bill Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Bill Summary
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(calculations.subtotal)}</span>
                  </div>

                  {calculations.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-red-600">
                        -{formatCurrency(calculations.discountAmount)}
                      </span>
                    </div>
                  )}

                  {calculations.gstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GST ({watchGstRate}%)</span>
                      <span className="text-gray-900">
                        +{formatCurrency(calculations.gstAmount)}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span className="text-gray-900">Total</span>
                      <span className="text-blue-600">{formatCurrency(calculations.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={collectPayment}
                      onChange={(e) => setCollectPayment(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Collect Payment Now
                    </span>
                  </label>

                  {collectPayment && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Method
                        </label>
                        <select
                          {...register('paymentMethod')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={calculations.total}
                          {...register('paymentAmount')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={calculations.total.toFixed(2)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reference / Transaction ID
                        </label>
                        <input
                          {...register('paymentReference')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional"
                        />
                      </div>

                      {watchPaymentAmount > 0 &&
                        watchPaymentAmount < calculations.total && (
                          <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                            Balance due after payment:{' '}
                            <span className="font-medium">
                              {formatCurrency(calculations.total - watchPaymentAmount)}
                            </span>
                          </p>
                        )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-3">
                  <button
                    type="submit"
                    disabled={createBillMutation.isPending || !selectedPatient || fields.length === 0}
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaSave />
                    {createBillMutation.isPending ? 'Creating...' : 'Create Bill'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/billing')}
                    className="w-full px-4 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Click outside to close dropdowns */}
      {(showPatientDropdown || showProductDropdown) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowPatientDropdown(false);
            setShowProductDropdown(false);
          }}
        />
      )}
    </div>
  );
}

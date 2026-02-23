import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import settingsService from '../../services/settingsService';
import { useHasPerm, useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';
import pharmacyService from '../../services/pharmacyService';
import labsAgentsService from '../../services/labsAgentsService';

const BILL_TYPES = [
  { id: 'consultation', label: 'Consultation', color: 'blue' },
  { id: 'pharmacy', label: 'Pharmacy', color: 'green' },
  { id: 'lab', label: 'Lab Test', color: 'purple' },
];

const GST_RATES = [
  { value: 0, label: 'No GST (0%)' },
  { value: 5, label: 'GST 5%' },
  { value: 10, label: 'GST 10%' },
  { value: 12, label: 'GST 12%' },
  { value: 18, label: 'GST 18%' },
  { value: 20, label: 'GST 20%' },
  { value: 30, label: 'GST 30%' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'netbanking', label: 'Net Banking' },
  { value: 'insurance', label: 'Insurance' },
];

export default function NewBill() {
  const { id: billId } = useParams();
  const canCreateBill = useHasPerm('billing:create', ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST', 'RECEPTIONIST']);
  const canEditBill = useHasPerm('billing:edit', ['SUPER_ADMIN', 'DOCTOR', 'ACCOUNTANT', 'PHARMACIST', 'RECEPTIONIST']);
  const isEditMode = !!billId;
  if ((isEditMode && !canEditBill) || (!isEditMode && !canCreateBill)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold">Access denied</h2>
            <p className="text-sm text-gray-500 mt-2">You do not have permission to {isEditMode ? 'edit' : 'create'} bills.</p>
          </div>
        </div>
      </div>
    );
  }
  const navigate = useNavigate();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [billType, setBillType] = useState('consultation');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [labSearch, setLabSearch] = useState('');
  const [selectedLab, setSelectedLab] = useState(null);
  const [labTestSearch, setLabTestSearch] = useState('');
  const [showLabTestDropdown, setShowLabTestDropdown] = useState(false);
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
      // Module-level GST/discount defaults
      defaultConsultationGstPercent: 5,
      defaultPharmacyGstPercent: 10,
      defaultLabTestGstPercent: 20,
      defaultConsultationDiscountPercent: 0,
      defaultPharmacyDiscountPercent: 0,
      defaultLabTestDiscountPercent: 0,
    },
  });
  // --- UI for module-level GST/discount ---
  const renderModuleDefaults = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Module GST & Discount Defaults</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs mb-1">Consultation GST (%)</label>
          <input type="number" step="0.01" min="0" max="100" {...register('defaultConsultationGstPercent')} className="input input-bordered w-full mb-2" />
          <label className="block text-xs mb-1">Consultation Discount (%)</label>
          <input type="number" step="0.01" min="0" max="100" {...register('defaultConsultationDiscountPercent')} className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block text-xs mb-1">Pharmacy GST (%)</label>
          <input type="number" step="0.01" min="0" max="100" {...register('defaultPharmacyGstPercent')} className="input input-bordered w-full mb-2" />
          <label className="block text-xs mb-1">Pharmacy Discount (%)</label>
          <input type="number" step="0.01" min="0" max="100" {...register('defaultPharmacyDiscountPercent')} className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block text-xs mb-1">Lab Test GST (%)</label>
          <input type="number" step="0.01" min="0" max="100" {...register('defaultLabTestGstPercent')} className="input input-bordered w-full mb-2" />
          <label className="block text-xs mb-1">Lab Test Discount (%)</label>
          <input type="number" step="0.01" min="0" max="100" {...register('defaultLabTestDiscountPercent')} className="input input-bordered w-full" />
        </div>
      </div>
    </div>
  );

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items',
  });

  // Use watch to observe items; fall back to `fields` so we have a stable reference
  const watchItems = watch('items') || fields;
  const watchDiscount = watch('discount') || 0;
  const watchDiscountType = watch('discountType');
  const watchGstRate = Number(watch('gstRate') || 0);

  // Module-level defaults (watched so memo recalculates when changed)
  const defaultConsultationGst = Number(watch('defaultConsultationGstPercent') || 0);
  const defaultPharmacyGst = Number(watch('defaultPharmacyGstPercent') || 0);
  const defaultLabGst = Number(watch('defaultLabTestGstPercent') || 0);

  const defaultConsultationDiscount = Number(watch('defaultConsultationDiscountPercent') || 0);
  const defaultPharmacyDiscount = Number(watch('defaultPharmacyDiscountPercent') || 0);
  const defaultLabDiscount = Number(watch('defaultLabTestDiscountPercent') || 0);

  // Ensure gstRate is set as a numeric default so calculations run on first render
  useEffect(() => {
    setValue('gstRate', 0);
  }, [setValue]);
  const watchPaymentAmount = watch('paymentAmount') || 0;

  // Fetch billing doctors for dropdown
  const { data: doctorsData } = useQuery({
    queryKey: ['billing-doctors'],
    queryFn: () => billingService.getDoctors(),
    enabled: true,
  });

  const doctors = doctorsData?.data || [];
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const { user, normalizeRole } = useAuth();

  const effectiveRole = normalizeRole(user?.role);
  const isEffectiveDoctor = effectiveRole === 'DOCTOR';
  const canSeeAllDoctors = !!(user?.isClinicAdmin || ['SUPER_ADMIN', 'ACCOUNTANT'].includes(effectiveRole));
  // If API returned no doctors but current user is an effective doctor, include them
  const augmentedDoctors = useMemo(() => {
    try {
      const list = Array.isArray(doctors) ? [...doctors] : [];
      if (isEffectiveDoctor && user) {
        const exists = list.some((d) => d.id === user.id);
        if (!exists) list.unshift({ id: user.id, name: user.name, email: user.email });
      }
      return list;
    } catch (e) {
      return doctors || [];
    }
  }, [doctors, isEffectiveDoctor, user]);

  // Fetch clinic patients for billing search.
  const { data: patientsData } = useQuery({
    queryKey: ['billing-patients-search', patientSearch, selectedDoctor?.id],
    queryFn: () => billingService.getPatients({ search: patientSearch, limit: 10, doctorId: selectedDoctor?.id }),
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
  // Fetch labs for lab billing
  const { data: labsData } = useQuery({
    queryKey: ['labs-search', labSearch],
    queryFn: () => labsAgentsService.getLabs({ search: labSearch, limit: 10 }),
    enabled: billType === 'lab' && labSearch.length >= 1,
  });
  const labs = labsData?.data || [];

  // Fetch lab tests for selected lab
  const { data: labTestsData } = useQuery({
    queryKey: ['lab-tests', selectedLab?.id, labTestSearch],
    queryFn: () => labsAgentsService.getLabTests(selectedLab?.id, { search: labTestSearch, limit: 50 }),
    enabled: billType === 'lab' && !!selectedLab && labTestSearch.length >= 1,
  });
  const labTests = labTestsData?.data || [];

  const { data: consultationData } = useQuery({
    queryKey: ['consultation-fees'],
    queryFn: () => settingsService.getConsultationFees(),
  });
  const { data: taxSettingsData } = useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => settingsService.getTaxSettings(),
  });
  const consultationFees = consultationData?.data?.fees || {};
  const getConsultationFee = (doctorId) => Number(consultationFees?.[doctorId] || 0);

  useEffect(() => {
    if (isEditMode || !taxSettingsData) return;
    setValue('defaultConsultationGstPercent', Number(taxSettingsData.consultationGST ?? 0));
    setValue('defaultPharmacyGstPercent', Number(taxSettingsData.pharmacyGST ?? 0));
    setValue('defaultLabTestGstPercent', Number(taxSettingsData.labGST ?? 0));
  }, [isEditMode, taxSettingsData, setValue]);

  const resolveItemModule = (item) => {
    const rawType = String(item?.type || '').toLowerCase();
    if (rawType === 'consultation') return 'consultation';
    if (rawType === 'pharmacy' || rawType === 'medicine') return 'pharmacy';
    if (rawType === 'lab_test' || rawType === 'lab') return 'lab_test';
    if (item?.productId) return 'pharmacy';
    if (item?.labId || item?.labTestId) return 'lab_test';
    if (item?.doctorId) return 'consultation';
    return 'other';
  };

  const getModuleDefaults = (item) => {
    const moduleType = resolveItemModule(item);
    if (moduleType === 'consultation') {
      return { gstPercent: defaultConsultationGst, discountPercent: defaultConsultationDiscount };
    }
    if (moduleType === 'pharmacy') {
      return { gstPercent: defaultPharmacyGst, discountPercent: defaultPharmacyDiscount };
    }
    if (moduleType === 'lab_test') {
      return { gstPercent: defaultLabGst, discountPercent: defaultLabDiscount };
    }
    return { gstPercent: watchGstRate, discountPercent: 0 };
  };

  // Calculate totals - per-item GST/discount + module defaults + optional global bill discount
  const calculations = useMemo(() => {
    const items = watchItems || [];
    const moduleSummary = {
      consultation: { label: 'Consultation', subtotal: 0, discount: 0, taxable: 0, gst: 0, total: 0 },
      pharmacy: { label: 'Pharmacy', subtotal: 0, discount: 0, taxable: 0, gst: 0, total: 0 },
      lab_test: { label: 'Lab Test', subtotal: 0, discount: 0, taxable: 0, gst: 0, total: 0 },
      other: { label: 'Other', subtotal: 0, discount: 0, taxable: 0, gst: 0, total: 0 },
    };

    const computedItems = items.map((item) => {
      const moduleType = resolveItemModule(item);
      const qty = Math.max(0, parseFloat(item.quantity) || 0);
      const unitPrice = Math.max(0, parseFloat(item.unitPrice) || 0);
      const lineSubtotal = qty * unitPrice;

      let discountAmount = parseFloat(item.discountAmount);
      if (!Number.isFinite(discountAmount) || discountAmount < 0) {
        let discountPercent = parseFloat(item.discountPercent);
        if (!Number.isFinite(discountPercent) || discountPercent < 0) {
          if (moduleType === 'consultation') discountPercent = defaultConsultationDiscount;
          else if (moduleType === 'pharmacy') discountPercent = defaultPharmacyDiscount;
          else if (moduleType === 'lab_test') discountPercent = defaultLabDiscount;
          else discountPercent = 0;
        }
        discountAmount = (lineSubtotal * discountPercent) / 100;
      }
      if (discountAmount > lineSubtotal) discountAmount = lineSubtotal;

      let gstPercent = parseFloat(item.gstPercent);
      if (!Number.isFinite(gstPercent) || gstPercent < 0) {
        if (moduleType === 'consultation') gstPercent = defaultConsultationGst;
        else if (moduleType === 'pharmacy') gstPercent = defaultPharmacyGst;
        else if (moduleType === 'lab_test') gstPercent = defaultLabGst;
        else gstPercent = watchGstRate;
      }

      const taxableBeforeGlobal = Math.max(0, lineSubtotal - discountAmount);
      const gstBeforeGlobal = (taxableBeforeGlobal * gstPercent) / 100;

      moduleSummary[moduleType].subtotal += lineSubtotal;
      moduleSummary[moduleType].discount += discountAmount;
      moduleSummary[moduleType].taxable += taxableBeforeGlobal;
      moduleSummary[moduleType].gst += gstBeforeGlobal;

      return { moduleType, taxableBeforeGlobal };
    });

    const subtotal = Object.values(moduleSummary).reduce((sum, m) => sum + m.subtotal, 0);
    const itemDiscountTotal = Object.values(moduleSummary).reduce((sum, m) => sum + m.discount, 0);
    const taxableBeforeGlobal = Object.values(moduleSummary).reduce((sum, m) => sum + m.taxable, 0);

    let globalDiscountAmount = 0;
    if (watchDiscountType === 'percentage') {
      globalDiscountAmount = (taxableBeforeGlobal * (parseFloat(watchDiscount) || 0)) / 100;
    } else {
      globalDiscountAmount = parseFloat(watchDiscount) || 0;
    }
    if (globalDiscountAmount > taxableBeforeGlobal) globalDiscountAmount = taxableBeforeGlobal;

    const taxScale = taxableBeforeGlobal > 0 ? (taxableBeforeGlobal - globalDiscountAmount) / taxableBeforeGlobal : 0;
    const adjustedSummary = Object.keys(moduleSummary).reduce((acc, key) => {
      const module = moduleSummary[key];
      const adjustedTaxable = module.taxable * taxScale;
      const adjustedGst = module.gst * taxScale;
      acc[key] = {
        ...module,
        taxable: adjustedTaxable,
        gst: adjustedGst,
        total: adjustedTaxable + adjustedGst,
      };
      return acc;
    }, {});

    const gstAmount = Object.values(adjustedSummary).reduce((sum, m) => sum + m.gst, 0);
    const taxableTotal = Object.values(adjustedSummary).reduce((sum, m) => sum + m.taxable, 0);
    const total = taxableTotal + gstAmount;

    return {
      subtotal,
      itemDiscountAmount: itemDiscountTotal,
      globalDiscountAmount,
      discountAmount: itemDiscountTotal + globalDiscountAmount,
      gstAmount,
      total,
      moduleSummary: adjustedSummary,
      computedItems,
    };
  }, [JSON.stringify(watchItems || []), watchDiscount, watchDiscountType, watchGstRate, defaultConsultationGst, defaultPharmacyGst, defaultLabGst, defaultConsultationDiscount, defaultPharmacyDiscount, defaultLabDiscount]);

  // Create bill mutation
  const queryClient = useQueryClient();

  const createBillMutation = useMutation({
    mutationFn: (data) => billingService.createBill(data),
    onSuccess: (data) => {
      toast.success('Bill created successfully');
      // Refresh billing list so the new bill appears immediately
      queryClient.invalidateQueries(['bills']);
      navigate(`/billing`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create bill');
    },
  });

  // Edit mode: if billId present, fetch bill and populate form
  const { data: billData } = useQuery({
    queryKey: ['bill', billId],
    queryFn: () => (billId ? billingService.getBill(billId) : Promise.resolve(null)),
    enabled: !!billId,
  });

  useEffect(() => {
    if (billData && billId) {
      const b = billData.data || billData;
      // Populate patient & doctor
      setSelectedPatient(b.patient || null);
      if (b.doctor) setSelectedDoctor({ id: b.doctor.id, name: b.doctor.name });
      // Map backend type (e.g., 'PHARMACY') to local billType ('pharmacy')
      if (b.type) {
        const t = (b.type || '').toString().toUpperCase();
        if (t === 'PHARMACY') setBillType('pharmacy');
        else if (t === 'LAB_TEST') setBillType('lab');
        else if (t === 'CONSULTATION') setBillType('consultation');
        else setBillType('consultation');
      }

      const items = (b.items || []).map(it => ({
        productId: it.productId || null,
        labId: it.labId || null,
        labTestId: it.labTestId || null,
        description: it.description || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || it.amount || 0,
        type: resolveItemModule(it),
        gstPercent: it.gstPercent ?? '',
        discountPercent: it.discountPercent ?? '',
        discountAmount: it.discountAmount ?? '',
        doctorId: it.doctorId || undefined,
      }));

      try {
        setValue('items', items);
        // Discount: prefer discountPercent when present
        if (b.discountPercent !== null && b.discountPercent !== undefined) {
          setValue('discount', b.discountPercent || 0);
          setValue('discountType', 'percentage');
        } else {
          setValue('discount', b.discountAmount || 0);
          setValue('discountType', 'fixed');
        }

        // GST rate: compute from taxAmount and taxable base when possible
        const subtotal = Number(b.subtotal || 0);
        const discountAmount = Number(b.discountAmount || 0);
        const taxableBase = subtotal - discountAmount;
        if (taxableBase > 0) {
          const gstRate = ((Number(b.taxAmount || 0) / taxableBase) * 100) || 0;
          // round to 2 decimals
          setValue('gstRate', Math.round(gstRate * 100) / 100);
        } else {
          setValue('gstRate', 0);
        }

        setValue('notes', b.notes || '');
        setValue('defaultConsultationGstPercent', b.defaultConsultationGstPercent ?? 5);
        setValue('defaultPharmacyGstPercent', b.defaultPharmacyGstPercent ?? 10);
        setValue('defaultLabTestGstPercent', b.defaultLabTestGstPercent ?? 20);
        setValue('defaultConsultationDiscountPercent', b.defaultConsultationDiscountPercent ?? 0);
        setValue('defaultPharmacyDiscountPercent', b.defaultPharmacyDiscountPercent ?? 0);
        setValue('defaultLabTestDiscountPercent', b.defaultLabTestDiscountPercent ?? 0);
      } catch (e) {
        // ignore setValue errors
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billData, billId]);

  // Update bill mutation (edit)
  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }) => billingService.updateBill(id, data),
    onSuccess: () => {
      toast.success('Bill updated successfully');
      queryClient.invalidateQueries(['bills']);
      navigate('/billing');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update bill');
    },
  });

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setShowPatientDropdown(false);

    try {
      const prefillRes = await billingService.getPrefill(patient.id);
      const prefill = prefillRes?.data;
      if (prefill?.hasPrefill && Array.isArray(prefill.items) && prefill.items.length > 0) {
        const mappedPrefill = prefill.items.map((item) => ({
          ...item,
          type: resolveItemModule(item),
        }));
        mappedPrefill.forEach((item, idx) => {
          const defaults = getModuleDefaults(item);
          if (item.gstPercent === '' || item.gstPercent == null) item.gstPercent = defaults.gstPercent;
          if ((item.discountPercent === '' || item.discountPercent == null) && (item.discountAmount === '' || item.discountAmount == null)) {
            item.discountPercent = defaults.discountPercent;
          }
          mappedPrefill[idx] = item;
        });
        replace(mappedPrefill);
        setValue('items', mappedPrefill);
        // If prescription has a doctor, set billing doctor to match
        if (prefill.doctor?.id) {
          setSelectedDoctor({ id: prefill.doctor.id, name: prefill.doctor.name });
        }
        toast.success('Medicine and lab test amounts prefilled from latest prescription');
      }
    } catch (e) {
      // Keep manual billing flow working even if prefill fails
      console.error('Failed to prefill bill from prescription:', e);
    }
  };

  const handleDoctorSelect = (doc) => {
    setSelectedDoctor(doc || null);
    // clear selected patient when doctor changes
    setSelectedPatient(null);
    setPatientSearch('');
  };

  // Default selected doctor for effective doctors who are not admins
  useEffect(() => {
    if (!canSeeAllDoctors && isEffectiveDoctor && user) {
      // prefer doctor's entry from fetched doctors if available
      const me = augmentedDoctors.find((d) => d.id === user.id) || { id: user.id, name: user.name };
      setSelectedDoctor(me);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isEffectiveDoctor, canSeeAllDoctors]);

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
        type: 'pharmacy',
        gstPercent: defaultPharmacyGst,
        discountPercent: defaultPharmacyDiscount,
      });
      toast.success(`${product.name} added to bill`);
    }

    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleLabSelect = (lab) => {
    setSelectedLab(lab);
    setLabSearch(lab.name);
  };

  const handleLabTestSelect = (test) => {
    // Add lab test as bill item
    append({
      productId: null,
      description: test.name,
      quantity: 1,
      unitPrice: test.price || 0,
      type: 'lab_test',
      labId: selectedLab?.id || test.labId || null,
      labTestId: test.id || null,
      gstPercent: defaultLabGst,
      discountPercent: defaultLabDiscount,
    });
    toast.success(`${test.name} added to bill`);
    setLabTestSearch('');
    setShowLabTestDropdown(false);
  };

  const addManualItem = () => {
    const consultationDoctorId =
      selectedDoctor?.id || (isEffectiveDoctor && !canSeeAllDoctors ? user?.id : undefined);
    append({
      productId: null,
      description: '',
      quantity: 1,
      unitPrice: billType === 'consultation' ? getConsultationFee(consultationDoctorId) : 0,
      type: billType === 'consultation' ? 'consultation' : billType === 'lab' ? 'lab_test' : billType === 'pharmacy' ? 'pharmacy' : 'other',
      // default doctor for consultation items to current user when they are a doctor and not an admin
      doctorId:
        billType === 'consultation'
          ? (selectedDoctor?.id || (isEffectiveDoctor && !canSeeAllDoctors ? user?.id : undefined))
          : undefined,
      gstPercent: billType === 'consultation' ? defaultConsultationGst : billType === 'lab' ? defaultLabGst : billType === 'pharmacy' ? defaultPharmacyGst : watchGstRate,
      discountPercent: billType === 'consultation' ? defaultConsultationDiscount : billType === 'lab' ? defaultLabDiscount : billType === 'pharmacy' ? defaultPharmacyDiscount : 0,
    });
  };

  useEffect(() => {
    (watchItems || []).forEach((item, index) => {
      const defaults = getModuleDefaults(item);
      const gstEmpty = item?.gstPercent === '' || item?.gstPercent == null;
      const discountPercentEmpty = item?.discountPercent === '' || item?.discountPercent == null;
      const discountAmountEmpty = item?.discountAmount === '' || item?.discountAmount == null;

      if (gstEmpty) {
        setValue(`items.${index}.gstPercent`, defaults.gstPercent);
      }
      if (discountPercentEmpty && discountAmountEmpty) {
        setValue(`items.${index}.discountPercent`, defaults.discountPercent);
      }
    });
  }, [watchItems, defaultConsultationGst, defaultPharmacyGst, defaultLabGst, defaultConsultationDiscount, defaultPharmacyDiscount, defaultLabDiscount, watchGstRate, setValue]);

  useEffect(() => {
    if (billType !== 'consultation') return;
    const consultationDoctorId =
      selectedDoctor?.id || (isEffectiveDoctor && !canSeeAllDoctors ? user?.id : undefined);
    if (!consultationDoctorId) return;
    const fee = getConsultationFee(consultationDoctorId);
    if (fee <= 0) return;

    (watchItems || []).forEach((item, index) => {
      const itemType = (item?.type || '').toLowerCase();
      if (itemType !== 'consultation') return;
      if (!item?.doctorId) setValue(`items.${index}.doctorId`, consultationDoctorId);
      if (!item?.unitPrice || Number(item.unitPrice) <= 0) {
        setValue(`items.${index}.unitPrice`, fee);
      }
    });
  }, [billType, selectedDoctor?.id, consultationFees, isEffectiveDoctor, canSeeAllDoctors, user?.id, watchItems, setValue]);

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

    const normalizedDiscountType = String(data.discountType || 'fixed').toLowerCase() === 'percentage' ? 'PERCENTAGE' : 'AMOUNT';

    const billData = {
      patientId: selectedPatient.id,
      doctorId: selectedDoctor?.id,
      type: billTypeMap[billType] || 'MIXED',
      items: data.items.map((item) => ({
        description: item.description,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        type: resolveItemModule(item),
        gstPercent: item.gstPercent !== '' && item.gstPercent != null ? parseFloat(item.gstPercent) : null,
        discountPercent: item.discountPercent !== '' && item.discountPercent != null ? parseFloat(item.discountPercent) : null,
        discountAmount: item.discountAmount !== '' && item.discountAmount != null ? parseFloat(item.discountAmount) : null,
        productId: item.productId || undefined,
        labId: item.labId || undefined,
        labTestId: item.labTestId || undefined,
        doctorId: item.doctorId || undefined,
      })),
      discount: parseFloat(data.discount) || 0,
      discountType: normalizedDiscountType,
      taxConfig: { gstRate: parseFloat(data.gstRate) || 0 },
      notes: data.notes,
      defaultConsultationGstPercent: parseFloat(data.defaultConsultationGstPercent) || 0,
      defaultPharmacyGstPercent: parseFloat(data.defaultPharmacyGstPercent) || 0,
      defaultLabTestGstPercent: parseFloat(data.defaultLabTestGstPercent) || 0,
      defaultConsultationDiscountPercent: parseFloat(data.defaultConsultationDiscountPercent) || 0,
      defaultPharmacyDiscountPercent: parseFloat(data.defaultPharmacyDiscountPercent) || 0,
      defaultLabTestDiscountPercent: parseFloat(data.defaultLabTestDiscountPercent) || 0,
    };

    // If collecting payment immediately
    if (collectPayment && parseFloat(data.paymentAmount) > 0) {
      billData.payment = {
        amount: parseFloat(data.paymentAmount),
        method: data.paymentMethod,
        reference: data.paymentReference,
      };
    }

    if (billId) {
      updateBillMutation.mutate({ id: billId, data: billData });
    } else {
      createBillMutation.mutate(billData);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getItemPreview = (item) => {
    const moduleType = resolveItemModule(item);
    const quantity = Math.max(0, Number(item?.quantity || 0));
    const unitPrice = Math.max(0, Number(item?.unitPrice || 0));
    const subtotal = quantity * unitPrice;

    let discountAmount = Number(item?.discountAmount);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      let discountPercent = Number(item?.discountPercent);
      if (!Number.isFinite(discountPercent) || discountPercent < 0) {
        if (moduleType === 'consultation') discountPercent = defaultConsultationDiscount;
        else if (moduleType === 'pharmacy') discountPercent = defaultPharmacyDiscount;
        else if (moduleType === 'lab_test') discountPercent = defaultLabDiscount;
        else discountPercent = 0;
      }
      discountAmount = (subtotal * discountPercent) / 100;
    }
    if (discountAmount > subtotal) discountAmount = subtotal;

    let gstPercent = Number(item?.gstPercent);
    if (!Number.isFinite(gstPercent) || gstPercent < 0) {
      if (moduleType === 'consultation') gstPercent = defaultConsultationGst;
      else if (moduleType === 'pharmacy') gstPercent = defaultPharmacyGst;
      else if (moduleType === 'lab_test') gstPercent = defaultLabGst;
      else gstPercent = watchGstRate;
    }

    const taxable = Math.max(0, subtotal - discountAmount);
    const gstAmount = (taxable * gstPercent) / 100;
    return { subtotal, discountAmount, taxable, gstAmount, total: taxable + gstAmount };
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
              {renderModuleDefaults()}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaUser className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Patient</h2>
                </div>

                <div className="relative">
                    <div className="flex gap-3">
                      <div className="w-1/3">
                        <select
                          value={selectedDoctor?.id || ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            const doc = augmentedDoctors.find((d) => d.id === id) || null;
                            handleDoctorSelect(doc);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {canSeeAllDoctors && <option value="">All Doctors</option>}
                          {augmentedDoctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>{doc.name}</option>
                          ))}
                        </select>
                        {!canSeeAllDoctors && (
                          <p className="text-xs text-gray-400 mt-1">Listing patients for all doctors is restricted to clinic admins and accountants.</p>
                        )}
                      </div>

                      <div className="flex-1 relative">
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
                      </div>
                    </div>

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
                            {patient.phone} {patient.email && `â€¢ ${patient.email}`}
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
                      {selectedPatient.email && ` â€¢ ${selectedPatient.email}`}
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

                  {/* Lab selection & Test Search (for Lab bills) */}
                  {billType === 'lab' && (
                    <div className="mb-4 bg-white rounded p-4 border border-gray-100">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Lab</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={labSearch}
                            onChange={(e) => { setLabSearch(e.target.value); }}
                            onFocus={() => setLabSearch(labSearch)}
                            placeholder="Search labs..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {labSearch && labs.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                              {labs.map((lab) => (
                                <button key={lab.id} type="button" onClick={() => handleLabSelect(lab)} className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-gray-900">{lab.name}</p>
                                      {lab.contactPerson && <p className="text-xs text-gray-500">{lab.contactPerson}</p>}
                                    </div>
                                    <div className="text-sm text-gray-500">{lab._count?.bills || ''}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedLab && (
                        <div>
                          <p className="text-sm text-gray-700 mb-2">Selected Lab: <strong>{selectedLab.name}</strong></p>
                          <div className="relative mb-2">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={labTestSearch}
                              onChange={(e) => { setLabTestSearch(e.target.value); setShowLabTestDropdown(true); }}
                              onFocus={() => setShowLabTestDropdown(true)}
                              placeholder="Search lab tests..."
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {showLabTestDropdown && labTestSearch.length >= 1 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {labTests.length === 0 ? (
                                  <div className="px-4 py-3 text-sm text-gray-500">No lab tests found</div>
                                ) : (
                                  labTests.map((test) => (
                                    <button key={test.id} type="button" onClick={() => handleLabTestSelect(test)} className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <p className="font-medium text-gray-900">{test.name}</p>
                                          {test.category && <p className="text-sm text-gray-500">{test.category}</p>}
                                        </div>
                                        <div className="text-sm font-medium text-gray-800">{test.price} {test.currency || 'INR'}</div>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
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
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className={`rounded-xl border shadow-sm overflow-hidden ${index % 2 === 0 ? 'bg-white border-gray-200' : 'bg-slate-50/70 border-slate-300'}`}
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/80 bg-white/70">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                              Item {index + 1}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-50 border border-blue-100 text-blue-700 uppercase">
                              {resolveItemModule(watchItems?.[index] || field).replace('_', ' ')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove item"
                          >
                            <FaTrash />
                          </button>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                              Line 1: Item Details
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              <div className={resolveItemModule(watchItems?.[index] || field) === 'consultation' ? 'md:col-span-6' : 'md:col-span-9'}>
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
                              {resolveItemModule(watchItems?.[index] || field) === 'consultation' && (
                                <div className="md:col-span-3">
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Doctor</label>
                                  <select
                                    {...register(`items.${index}.doctorId`, {
                                      onChange: (e) => {
                                        const doctorId = e?.target?.value;
                                        if (!doctorId) return;
                                        const fee = getConsultationFee(doctorId);
                                        setValue(`items.${index}.unitPrice`, Number.isFinite(fee) ? fee : 0);
                                      },
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                  >
                                    {!canSeeAllDoctors && <option value={user?.id}>{user?.name}</option>}
                                    {canSeeAllDoctors && <option value="">Select doctor</option>}
                                    {augmentedDoctors.map((d) => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <div className="md:col-span-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
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
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Price (INR)</label>
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
                          </div>
                          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 mb-2">
                              Line 2: GST & Discount
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                              <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">GST (%)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  {...register(`items.${index}.gstPercent`)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                              <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Discount (%)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  {...register(`items.${index}.discountPercent`)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                              <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Discount Amount</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...register(`items.${index}.discountAmount`)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
                          {(() => {
                            const preview = getItemPreview(watchItems?.[index] || field);
                            return `Line Total ${formatCurrency(preview.total)} | Taxable ${formatCurrency(preview.taxable)} | GST ${formatCurrency(preview.gstAmount)}`;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Discount & GST */}
              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/80 bg-white/70">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700">
                      Billing Rules
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-50 border border-blue-100 text-blue-700 uppercase">
                      <FaPercent className="text-[10px]" />
                      Bill-Level Discount
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Discount Controls
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-6">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Discount Type
                        </label>
                        <select
                          {...register('discountType')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="fixed">Fixed Amount (INR)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                      </div>
                      <div className="md:col-span-6">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Discount {watchDiscountType === 'percentage' ? '(%)' : '(INR)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register('discount')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 mb-2">
                      Tax Fallback
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-6">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Fallback GST For Other Items
                        </label>
                        <select
                          {...register('gstRate')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  {Object.values(calculations.moduleSummary || {}).filter((module) => module.subtotal > 0).map((module) => (
                    <div key={module.label} className="rounded-lg border border-gray-100 p-3 bg-gray-50/60">
                      <div className="flex justify-between text-sm font-medium text-gray-800">
                        <span>{module.label}</span>
                        <span>{formatCurrency(module.total)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Subtotal</span>
                        <span>{formatCurrency(module.subtotal)}</span>
                      </div>
                      {module.discount > 0 && (
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Item Discount</span>
                          <span>-{formatCurrency(module.discount)}</span>
                        </div>
                      )}
                      {module.gst > 0 && (
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>GST</span>
                          <span>+{formatCurrency(module.gst)}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(calculations.subtotal)}</span>
                  </div>

                  {calculations.itemDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Item Discounts</span>
                      <span className="text-red-600">
                        -{formatCurrency(calculations.itemDiscountAmount)}
                      </span>
                    </div>
                  )}

                  {calculations.globalDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Bill Discount</span>
                      <span className="text-red-600">
                        -{formatCurrency(calculations.globalDiscountAmount)}
                      </span>
                    </div>
                  )}

                  {calculations.gstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GST</span>
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
                          Amount (â‚¹)
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

import { prisma } from '../index.js';

export const SUPER_ADMIN_CONTROLS_KEY = 'super_admin_controls';

const MS_DAY = 24 * 60 * 60 * 1000;

function safeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_DAY);
}

function toNonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function defaultSubscriptionPolicy(clinicCreatedAt) {
  const start = safeDate(clinicCreatedAt) || new Date();
  return {
    trialDays: 14,
    graceDays: 3,
    planCode: 'TRIAL',
    planCycle: 'MONTHLY',
    trialStartAt: start.toISOString(),
    expiresAt: addDays(start, 14).toISOString(),
    extraUsersPurchased: 0,
    extraUserPrice: 249,
    referralAnnualDiscountPercent: 10,
    referralEligibleAfterPaidMonths: 2,
  };
}

function getPlanDefaults(planCode) {
  const p = String(planCode || 'TRIAL').toUpperCase();
  if (p === 'STARTER') {
    return {
      includedUsers: 3,
      monthlyInvoiceUploads: 100,
      priceMonthly: 999,
      sixMonthDiscountPercent: 10,
      yearlyDiscountPercent: 20,
    };
  }
  if (p === 'GROWTH') {
    return {
      includedUsers: 5,
      monthlyInvoiceUploads: 300,
      priceMonthly: 1999,
      sixMonthDiscountPercent: 10,
      yearlyDiscountPercent: 20,
    };
  }
  return {
    includedUsers: 1,
    monthlyInvoiceUploads: 0,
    priceMonthly: 0,
    sixMonthDiscountPercent: 0,
    yearlyDiscountPercent: 0,
  };
}

export function normalizeAccessControls(value, clinicCreatedAt) {
  const src = value && typeof value === 'object' ? value : {};
  const disabledPermissions = Array.isArray(src.disabledPermissions)
    ? [...new Set(src.disabledPermissions.map((p) => String(p || '').trim()).filter(Boolean))]
    : [];

  const normalizeLimit = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  };

  const baseSubscription = defaultSubscriptionPolicy(clinicCreatedAt);
  const rawSub = src.subscription && typeof src.subscription === 'object' ? src.subscription : {};
  const planCode = String(rawSub.planCode || baseSubscription.planCode).toUpperCase();
  const planDefaults = getPlanDefaults(planCode);

  const subscription = {
    ...baseSubscription,
    ...rawSub,
    planCode,
    planCycle: String(rawSub.planCycle || baseSubscription.planCycle).toUpperCase(),
    trialDays: toNonNegativeInt(rawSub.trialDays, baseSubscription.trialDays) || 14,
    graceDays: toNonNegativeInt(rawSub.graceDays, baseSubscription.graceDays) || 3,
    extraUsersPurchased: toNonNegativeInt(rawSub.extraUsersPurchased, 0),
    extraUserPrice: toNonNegativeInt(rawSub.extraUserPrice, 249) || 249,
    referralAnnualDiscountPercent: toNonNegativeInt(rawSub.referralAnnualDiscountPercent, 10) || 10,
    referralEligibleAfterPaidMonths: toNonNegativeInt(rawSub.referralEligibleAfterPaidMonths, 2) || 2,
    includedUsers: toNonNegativeInt(rawSub.includedUsers, planDefaults.includedUsers),
    monthlyInvoiceUploads: toNonNegativeInt(rawSub.monthlyInvoiceUploads, planDefaults.monthlyInvoiceUploads),
    priceMonthly: toNonNegativeInt(rawSub.priceMonthly, planDefaults.priceMonthly),
    sixMonthDiscountPercent: toNonNegativeInt(rawSub.sixMonthDiscountPercent, 10),
    yearlyDiscountPercent: toNonNegativeInt(rawSub.yearlyDiscountPercent, 20),
    trialInvoiceUploadLimit: toNonNegativeInt(rawSub.trialInvoiceUploadLimit, 10) || 10,
    reminderDays: Array.isArray(rawSub.reminderDays) && rawSub.reminderDays.length
      ? rawSub.reminderDays.map((n) => toNonNegativeInt(n, 0)).filter((n) => [7, 3, 1].includes(n))
      : [7, 3, 1],
  };

  return {
    disabledPermissions,
    invoiceUploadLimit: {
      monthly: normalizeLimit(src?.invoiceUploadLimit?.monthly),
      yearly: normalizeLimit(src?.invoiceUploadLimit?.yearly),
    },
    staffLimit: normalizeLimit(src?.staffLimit),
    subscription,
  };
}

export function getSubscriptionSnapshot(controls, now = new Date()) {
  const sub = controls?.subscription || defaultSubscriptionPolicy(now);
  const trialStart = safeDate(sub.trialStartAt) || now;
  let expiresAt = safeDate(sub.expiresAt);
  if (!expiresAt) {
    expiresAt = addDays(trialStart, toNonNegativeInt(sub.trialDays, 14) || 14);
  }
  const graceEndsAt = addDays(expiresAt, toNonNegativeInt(sub.graceDays, 3) || 3);
  const msToExpiry = expiresAt.getTime() - now.getTime();
  const daysToExpiry = Math.ceil(msToExpiry / MS_DAY);

  let status = 'ACTIVE';
  const planCode = String(sub.planCode || 'TRIAL').toUpperCase();
  if (planCode === 'TRIAL' && now <= expiresAt) status = 'TRIAL';
  else if (now <= expiresAt) status = 'ACTIVE';
  else if (now <= graceEndsAt) status = 'GRACE';
  else status = 'EXPIRED';

  const remindersDue = Array.isArray(sub.reminderDays)
    ? sub.reminderDays.filter((d) => d === daysToExpiry)
    : [];

  return {
    status,
    planCode,
    expiresAt: expiresAt.toISOString(),
    graceEndsAt: graceEndsAt.toISOString(),
    daysToExpiry,
    isReadOnly: status === 'EXPIRED',
    remindersDue,
  };
}

export function getEffectiveStaffLimit(controls) {
  const hardLimit = controls?.staffLimit;
  const included = toNonNegativeInt(controls?.subscription?.includedUsers, 0);
  const extra = toNonNegativeInt(controls?.subscription?.extraUsersPurchased, 0);
  const planLimit = included + extra;

  if (!hardLimit && !planLimit) return null;
  if (!hardLimit) return planLimit || null;
  if (!planLimit) return hardLimit || null;
  return Math.min(hardLimit, planLimit);
}

export function getEffectiveUploadLimits(controls) {
  const sub = controls?.subscription || {};
  const planCode = String(sub.planCode || 'TRIAL').toUpperCase();
  const trialTotal = toNonNegativeInt(sub.trialInvoiceUploadLimit, 10) || 10;
  const planMonthly = toNonNegativeInt(sub.monthlyInvoiceUploads, 0);
  const overrideMonthly = controls?.invoiceUploadLimit?.monthly;
  const yearly = controls?.invoiceUploadLimit?.yearly ?? null;
  const monthly = overrideMonthly ?? (planCode === 'TRIAL' ? null : planMonthly || null);
  return {
    trialTotal: planCode === 'TRIAL' ? trialTotal : null,
    monthly,
    yearly,
  };
}

export async function getClinicControls(clinicId) {
  const [row, clinic] = await Promise.all([
    prisma.clinicSettings.findUnique({
      where: { clinicId_key: { clinicId, key: SUPER_ADMIN_CONTROLS_KEY } },
      select: { value: true },
    }),
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { createdAt: true } }),
  ]);
  let parsed = {};
  try {
    parsed = row?.value ? JSON.parse(row.value) : {};
  } catch (_err) {
    parsed = {};
  }
  return normalizeAccessControls(parsed, clinic?.createdAt || new Date());
}

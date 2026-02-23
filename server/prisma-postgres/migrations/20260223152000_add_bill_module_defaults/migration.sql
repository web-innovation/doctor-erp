-- Add per-module GST and discount defaults to Bill (PostgreSQL)
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "defaultConsultationGstPercent" DOUBLE PRECISION;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "defaultPharmacyGstPercent" DOUBLE PRECISION;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "defaultLabTestGstPercent" DOUBLE PRECISION;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "defaultConsultationDiscountPercent" DOUBLE PRECISION;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "defaultPharmacyDiscountPercent" DOUBLE PRECISION;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "defaultLabTestDiscountPercent" DOUBLE PRECISION;

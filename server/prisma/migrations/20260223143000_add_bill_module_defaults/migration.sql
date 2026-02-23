-- Add per-module GST and discount default fields to Bill
ALTER TABLE "Bill" ADD COLUMN "defaultConsultationGstPercent" REAL;
ALTER TABLE "Bill" ADD COLUMN "defaultPharmacyGstPercent" REAL;
ALTER TABLE "Bill" ADD COLUMN "defaultLabTestGstPercent" REAL;
ALTER TABLE "Bill" ADD COLUMN "defaultConsultationDiscountPercent" REAL;
ALTER TABLE "Bill" ADD COLUMN "defaultPharmacyDiscountPercent" REAL;
ALTER TABLE "Bill" ADD COLUMN "defaultLabTestDiscountPercent" REAL;

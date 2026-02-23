-- Add BillItem per-item discount fields (PostgreSQL)
ALTER TABLE "BillItem" ADD COLUMN IF NOT EXISTS "discountPercent" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "BillItem" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION DEFAULT 0;

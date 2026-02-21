-- Add isActive to Clinic for super-admin controls
ALTER TABLE "Clinic" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

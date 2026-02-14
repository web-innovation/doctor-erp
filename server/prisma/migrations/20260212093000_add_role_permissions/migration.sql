-- AlterTable: add rolePermissions JSON/text column to Clinic
ALTER TABLE "Clinic" ADD COLUMN "rolePermissions" TEXT;

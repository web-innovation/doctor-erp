-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentNo" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CONSULTATION',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "symptoms" TEXT,
    "notes" TEXT,
    "consultationFee" REAL,
    "bookedVia" TEXT,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT,
    CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("appointmentNo", "bookedVia", "clinicId", "confirmedAt", "consultationFee", "createdAt", "date", "id", "notes", "patientId", "status", "symptoms", "timeSlot", "type", "updatedAt") SELECT "appointmentNo", "bookedVia", "clinicId", "confirmedAt", "consultationFee", "createdAt", "date", "id", "notes", "patientId", "status", "symptoms", "timeSlot", "type", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_appointmentNo_key" ON "Appointment"("appointmentNo");
CREATE INDEX "Appointment_clinicId_date_idx" ON "Appointment"("clinicId", "date");
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
CREATE TABLE "new_Bill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billNo" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "discountPercent" REAL,
    "discountAmount" REAL,
    "taxAmount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "dueAmount" REAL NOT NULL,
    "taxBreakdown" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "patientId" TEXT,
    "clinicId" TEXT NOT NULL,
    "labId" TEXT,
    "agentId" TEXT,
    "doctorId" TEXT,
    CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Bill_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Bill_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Bill" ("agentId", "billNo", "clinicId", "createdAt", "date", "discountAmount", "discountPercent", "dueAmount", "id", "labId", "notes", "paidAmount", "patientId", "paymentMethod", "paymentStatus", "subtotal", "taxAmount", "taxBreakdown", "totalAmount", "type", "updatedAt") SELECT "agentId", "billNo", "clinicId", "createdAt", "date", "discountAmount", "discountPercent", "dueAmount", "id", "labId", "notes", "paidAmount", "patientId", "paymentMethod", "paymentStatus", "subtotal", "taxAmount", "taxBreakdown", "totalAmount", "type", "updatedAt" FROM "Bill";
DROP TABLE "Bill";
ALTER TABLE "new_Bill" RENAME TO "Bill";
CREATE UNIQUE INDEX "Bill_billNo_key" ON "Bill"("billNo");
CREATE INDEX "Bill_clinicId_idx" ON "Bill"("clinicId");
CREATE INDEX "Bill_patientId_idx" ON "Bill"("patientId");
CREATE INDEX "Bill_date_idx" ON "Bill"("date");
CREATE INDEX "Bill_paymentStatus_idx" ON "Bill"("paymentStatus");
CREATE TABLE "new_Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "age" INTEGER,
    "bloodGroup" TEXT,
    "address" TEXT,
    "city" TEXT,
    "emergencyContact" TEXT,
    "allergies" TEXT,
    "medicalHistory" TEXT,
    "insurance" TEXT,
    "primaryDoctorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clinicId" TEXT NOT NULL,
    CONSTRAINT "Patient_primaryDoctorId_fkey" FOREIGN KEY ("primaryDoctorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Patient_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Patient" ("address", "age", "allergies", "bloodGroup", "city", "clinicId", "createdAt", "dateOfBirth", "email", "emergencyContact", "gender", "id", "insurance", "medicalHistory", "name", "patientId", "phone", "updatedAt") SELECT "address", "age", "allergies", "bloodGroup", "city", "clinicId", "createdAt", "dateOfBirth", "email", "emergencyContact", "gender", "id", "insurance", "medicalHistory", "name", "patientId", "phone", "updatedAt" FROM "Patient";
DROP TABLE "Patient";
ALTER TABLE "new_Patient" RENAME TO "Patient";
CREATE UNIQUE INDEX "Patient_patientId_key" ON "Patient"("patientId");
CREATE INDEX "Patient_clinicId_idx" ON "Patient"("clinicId");
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");
CREATE INDEX "Patient_patientId_idx" ON "Patient"("patientId");
CREATE TABLE "new_Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prescriptionNo" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT,
    "symptoms" TEXT,
    "clinicalNotes" TEXT,
    "advice" TEXT,
    "followUpDate" DATETIME,
    "vitalsSnapshot" TEXT,
    "pdfUrl" TEXT,
    "sentViaWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "sentViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "doctorId" TEXT,
    CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Prescription" ("advice", "appointmentId", "clinicId", "clinicalNotes", "createdAt", "date", "diagnosis", "followUpDate", "id", "patientId", "pdfUrl", "prescriptionNo", "sentAt", "sentViaEmail", "sentViaWhatsApp", "symptoms", "updatedAt", "vitalsSnapshot") SELECT "advice", "appointmentId", "clinicId", "clinicalNotes", "createdAt", "date", "diagnosis", "followUpDate", "id", "patientId", "pdfUrl", "prescriptionNo", "sentAt", "sentViaEmail", "sentViaWhatsApp", "symptoms", "updatedAt", "vitalsSnapshot" FROM "Prescription";
DROP TABLE "Prescription";
ALTER TABLE "new_Prescription" RENAME TO "Prescription";
CREATE UNIQUE INDEX "Prescription_prescriptionNo_key" ON "Prescription"("prescriptionNo");
CREATE UNIQUE INDEX "Prescription_appointmentId_key" ON "Prescription"("appointmentId");
CREATE INDEX "Prescription_clinicId_idx" ON "Prescription"("clinicId");
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");
CREATE INDEX "Prescription_date_idx" ON "Prescription"("date");
CREATE TABLE "new_PrescriptionLabTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testName" TEXT NOT NULL,
    "instructions" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "prescriptionId" TEXT NOT NULL,
    "labId" TEXT,
    CONSTRAINT "PrescriptionLabTest_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrescriptionLabTest_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PrescriptionLabTest" ("id", "instructions", "labId", "prescriptionId", "testName") SELECT "id", "instructions", "labId", "prescriptionId", "testName" FROM "PrescriptionLabTest";
DROP TABLE "PrescriptionLabTest";
ALTER TABLE "new_PrescriptionLabTest" RENAME TO "PrescriptionLabTest";
CREATE INDEX "PrescriptionLabTest_prescriptionId_idx" ON "PrescriptionLabTest"("prescriptionId");
CREATE TABLE "new_PrescriptionMedicine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "timing" TEXT,
    "quantity" INTEGER NOT NULL,
    "instructions" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "prescriptionId" TEXT NOT NULL,
    "productId" TEXT,
    CONSTRAINT "PrescriptionMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PrescriptionMedicine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PrescriptionMedicine" ("dosage", "duration", "frequency", "genericName", "id", "instructions", "medicineName", "prescriptionId", "productId", "quantity", "timing") SELECT "dosage", "duration", "frequency", "genericName", "id", "instructions", "medicineName", "prescriptionId", "productId", "quantity", "timing" FROM "PrescriptionMedicine";
DROP TABLE "PrescriptionMedicine";
ALTER TABLE "new_PrescriptionMedicine" RENAME TO "PrescriptionMedicine";
CREATE INDEX "PrescriptionMedicine_prescriptionId_idx" ON "PrescriptionMedicine"("prescriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "StaffAssignment_staffId_doctorId_unique";
CREATE UNIQUE INDEX "StaffAssignment_staffId_doctorId_key" ON "StaffAssignment"("staffId", "doctorId");

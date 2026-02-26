-- Add patient/prescription document storage
CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "uploadedById" TEXT,
    CONSTRAINT "PatientDocument_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PatientDocument_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PatientDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PatientDocument_clinicId_patientId_idx" ON "PatientDocument"("clinicId", "patientId");
CREATE INDEX "PatientDocument_prescriptionId_idx" ON "PatientDocument"("prescriptionId");
CREATE INDEX "PatientDocument_uploadedAt_idx" ON "PatientDocument"("uploadedAt");

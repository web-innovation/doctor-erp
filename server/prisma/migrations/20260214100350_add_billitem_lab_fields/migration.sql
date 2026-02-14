-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "labId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    CONSTRAINT "LabTest_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabTest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabStaff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TECHNICIAN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicId" TEXT NOT NULL,
    CONSTRAINT "LabStaff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LabStaff_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BillItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "gstPercent" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL,
    "billId" TEXT NOT NULL,
    "productId" TEXT,
    "labId" TEXT,
    "labTestId" TEXT,
    CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BillItem_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BillItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BillItem" ("amount", "billId", "description", "gstPercent", "id", "productId", "quantity", "unitPrice") SELECT "amount", "billId", "description", "gstPercent", "id", "productId", "quantity", "unitPrice" FROM "BillItem";
DROP TABLE "BillItem";
ALTER TABLE "new_BillItem" RENAME TO "BillItem";
CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");
CREATE INDEX "BillItem_labId_idx" ON "BillItem"("labId");
CREATE INDEX "BillItem_labTestId_idx" ON "BillItem"("labTestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_code_key" ON "LabTest"("code");

-- CreateIndex
CREATE INDEX "LabTest_labId_idx" ON "LabTest"("labId");

-- CreateIndex
CREATE INDEX "LabTest_clinicId_idx" ON "LabTest"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "LabStaff_staffId_key" ON "LabStaff"("staffId");

-- CreateIndex
CREATE INDEX "LabStaff_labId_idx" ON "LabStaff"("labId");

-- CreateIndex
CREATE INDEX "LabStaff_clinicId_idx" ON "LabStaff"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "LabStaff_staffId_labId_key" ON "LabStaff"("staffId", "labId");

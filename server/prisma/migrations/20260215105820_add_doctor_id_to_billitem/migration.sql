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
    "doctorId" TEXT,
    CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BillItem_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BillItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BillItem_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BillItem" ("amount", "billId", "description", "gstPercent", "id", "labId", "labTestId", "productId", "quantity", "unitPrice") SELECT "amount", "billId", "description", "gstPercent", "id", "labId", "labTestId", "productId", "quantity", "unitPrice" FROM "BillItem";
DROP TABLE "BillItem";
ALTER TABLE "new_BillItem" RENAME TO "BillItem";
CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");
CREATE INDEX "BillItem_labId_idx" ON "BillItem"("labId");
CREATE INDEX "BillItem_labTestId_idx" ON "BillItem"("labTestId");
CREATE INDEX "BillItem_doctorId_idx" ON "BillItem"("doctorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

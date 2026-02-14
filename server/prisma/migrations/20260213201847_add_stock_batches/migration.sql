-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" DATETIME,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "costPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "updatedVia" TEXT,
    "billImageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    CONSTRAINT "StockHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PharmacyProduct" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockHistory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockHistory" ("billImageUrl", "createdAt", "createdBy", "id", "newQty", "notes", "previousQty", "productId", "quantity", "reference", "type", "updatedVia") SELECT "billImageUrl", "createdAt", "createdBy", "id", "newQty", "notes", "previousQty", "productId", "quantity", "reference", "type", "updatedVia" FROM "StockHistory";
DROP TABLE "StockHistory";
ALTER TABLE "new_StockHistory" RENAME TO "StockHistory";
CREATE INDEX "StockHistory_productId_idx" ON "StockHistory"("productId");
CREATE INDEX "StockHistory_createdAt_idx" ON "StockHistory"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StockBatch_productId_idx" ON "StockBatch"("productId");

-- CreateIndex
CREATE INDEX "StockBatch_expiryDate_idx" ON "StockBatch"("expiryDate");

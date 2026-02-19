-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "accountId" TEXT,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LedgerEntry" ("account", "amount", "clinicId", "createdAt", "id", "note", "refId", "refType", "type") SELECT "account", "amount", "clinicId", "createdAt", "id", "note", "refId", "refType", "type" FROM "LedgerEntry";
DROP TABLE "LedgerEntry";
ALTER TABLE "new_LedgerEntry" RENAME TO "LedgerEntry";
CREATE INDEX "LedgerEntry_clinicId_idx" ON "LedgerEntry"("clinicId");
CREATE INDEX "LedgerEntry_accountId_idx" ON "LedgerEntry"("accountId");
CREATE INDEX "LedgerEntry_refType_refId_idx" ON "LedgerEntry"("refType", "refId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

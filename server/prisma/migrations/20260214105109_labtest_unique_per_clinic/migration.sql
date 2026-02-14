/*
  Warnings:

  - A unique constraint covering the columns `[clinicId,code]` on the table `LabTest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "LabTest_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_clinicId_code_key" ON "LabTest"("clinicId", "code");

CREATE TABLE "DashboardNotificationRead" (
    "id" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "DashboardNotificationRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DashboardNotificationRead_clinicId_userId_notificationKey_key"
ON "DashboardNotificationRead"("clinicId", "userId", "notificationKey");

CREATE INDEX "DashboardNotificationRead_clinicId_userId_idx"
ON "DashboardNotificationRead"("clinicId", "userId");

CREATE INDEX "DashboardNotificationRead_readAt_idx"
ON "DashboardNotificationRead"("readAt");

ALTER TABLE "DashboardNotificationRead"
ADD CONSTRAINT "DashboardNotificationRead_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DashboardNotificationRead"
ADD CONSTRAINT "DashboardNotificationRead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

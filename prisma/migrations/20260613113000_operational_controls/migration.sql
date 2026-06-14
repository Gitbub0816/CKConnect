CREATE TABLE "AccountingPeriod" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lockedById" UUID,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "AccountingPeriod_organizationId_startsOn_endsOn_key"
ON "AccountingPeriod"("organizationId", "startsOn", "endsOn");

CREATE INDEX "AccountingPeriod_organizationId_status_endsOn_idx"
ON "AccountingPeriod"("organizationId", "status", "endsOn");

ALTER TABLE "StoredFile" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING_UPLOAD';
ALTER TABLE "StoredFile" ADD COLUMN "scanStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "StoredFile" ADD COLUMN "retentionClass" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "StoredFile" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

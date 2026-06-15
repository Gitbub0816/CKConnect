ALTER TABLE "ManagedMailbox"
  ADD COLUMN "organizationDomainId" UUID,
  ADD COLUMN "localPart" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING_PROVIDER_SYNC',
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "lastProvisionedAt" TIMESTAMP(3),
  ADD COLUMN "lastProvisioningError" TEXT,
  ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "ManagedMailbox"
  ADD CONSTRAINT "ManagedMailbox_organizationDomainId_fkey"
  FOREIGN KEY ("organizationDomainId") REFERENCES "OrganizationDomain"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ManagedMailbox_organizationDomainId_status_idx"
  ON "ManagedMailbox"("organizationDomainId", "status");

CREATE TABLE "ComplianceControl" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "framework" TEXT NOT NULL,
  "controlId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "owner" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "implementation" TEXT,
  "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
  "lastReviewedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceControl_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceEvidence" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "controlId" UUID,
  "title" TEXT NOT NULL,
  "evidenceType" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "summary" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorAssessment" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "vendorName" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "dataCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "region" TEXT,
  "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'IN_REVIEW',
  "dpaStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "subprocessors" JSONB NOT NULL DEFAULT '[]',
  "lastReviewedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataSubjectRequest" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "requesterEmail" TEXT NOT NULL,
  "requesterName" TEXT,
  "requestType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'INTAKE',
  "jurisdiction" TEXT NOT NULL DEFAULT 'GDPR',
  "dueAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "responseSummary" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcessingActivity" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "dataCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dataSubjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "legalBasis" TEXT NOT NULL,
  "retentionClass" TEXT NOT NULL DEFAULT 'STANDARD',
  "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "crossBorderTransfer" BOOLEAN NOT NULL DEFAULT false,
  "safeguards" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProcessingActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentRecord" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subjectEmail" TEXT,
  "subjectType" TEXT NOT NULL DEFAULT 'CONTACT',
  "purpose" TEXT NOT NULL,
  "lawfulBasis" TEXT NOT NULL DEFAULT 'CONSENT',
  "status" TEXT NOT NULL DEFAULT 'GRANTED',
  "source" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMP(3),
  "evidenceJson" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiGovernanceEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "conversationId" UUID,
  "feature" TEXT NOT NULL,
  "riskCategory" TEXT NOT NULL DEFAULT 'LIMITED_RISK',
  "model" TEXT,
  "promptHash" TEXT,
  "outputHash" TEXT,
  "humanReviewed" BOOLEAN NOT NULL DEFAULT false,
  "transparencyNotice" TEXT,
  "safetyFlags" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiGovernanceEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComplianceControl_organizationId_framework_controlId_key"
  ON "ComplianceControl"("organizationId", "framework", "controlId");
CREATE INDEX "ComplianceControl_organizationId_framework_status_idx"
  ON "ComplianceControl"("organizationId", "framework", "status");
CREATE INDEX "ComplianceEvidence_organizationId_collectedAt_idx"
  ON "ComplianceEvidence"("organizationId", "collectedAt");
CREATE INDEX "ComplianceEvidence_controlId_idx"
  ON "ComplianceEvidence"("controlId");
CREATE UNIQUE INDEX "VendorAssessment_organizationId_vendorName_service_key"
  ON "VendorAssessment"("organizationId", "vendorName", "service");
CREATE INDEX "VendorAssessment_organizationId_status_riskLevel_idx"
  ON "VendorAssessment"("organizationId", "status", "riskLevel");
CREATE INDEX "DataSubjectRequest_organizationId_status_dueAt_idx"
  ON "DataSubjectRequest"("organizationId", "status", "dueAt");
CREATE INDEX "DataSubjectRequest_requesterEmail_idx"
  ON "DataSubjectRequest"("requesterEmail");
CREATE UNIQUE INDEX "ProcessingActivity_organizationId_name_key"
  ON "ProcessingActivity"("organizationId", "name");
CREATE INDEX "ProcessingActivity_organizationId_status_idx"
  ON "ProcessingActivity"("organizationId", "status");
CREATE INDEX "ConsentRecord_organizationId_purpose_status_idx"
  ON "ConsentRecord"("organizationId", "purpose", "status");
CREATE INDEX "ConsentRecord_subjectEmail_idx"
  ON "ConsentRecord"("subjectEmail");
CREATE INDEX "AiGovernanceEvent_organizationId_feature_createdAt_idx"
  ON "AiGovernanceEvent"("organizationId", "feature", "createdAt");
CREATE INDEX "AiGovernanceEvent_riskCategory_idx"
  ON "AiGovernanceEvent"("riskCategory");

ALTER TABLE "ComplianceControl"
  ADD CONSTRAINT "ComplianceControl_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_controlId_fkey"
  FOREIGN KEY ("controlId") REFERENCES "ComplianceControl"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorAssessment"
  ADD CONSTRAINT "VendorAssessment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingActivity"
  ADD CONSTRAINT "ProcessingActivity_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiGovernanceEvent"
  ADD CONSTRAINT "AiGovernanceEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

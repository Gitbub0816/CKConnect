ALTER TABLE "Organization"
  ADD COLUMN "publicId" TEXT NOT NULL DEFAULT ('org_' || replace(gen_random_uuid()::text, '-', '')),
  ADD COLUMN "operationalStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "User" ADD COLUMN "adminRole" TEXT;

CREATE UNIQUE INDEX "Organization_publicId_key" ON "Organization"("publicId");

CREATE TABLE "TenantSettings" (
  "organizationId" UUID NOT NULL,
  "profileJson" JSONB NOT NULL DEFAULT '{}',
  "bookingJson" JSONB NOT NULL DEFAULT '{}',
  "portalJson" JSONB NOT NULL DEFAULT '{}',
  "notificationJson" JSONB NOT NULL DEFAULT '{}',
  "securityJson" JSONB NOT NULL DEFAULT '{}',
  "accountingJson" JSONB NOT NULL DEFAULT '{}',
  "inventoryJson" JSONB NOT NULL DEFAULT '{}',
  "workforceJson" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "TenantSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE TABLE "CollaborationChannel" (
  "id" UUID NOT NULL, "publicId" TEXT NOT NULL, "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL, "description" TEXT, "channelType" TEXT NOT NULL DEFAULT 'INTERNAL',
  "visibility" TEXT NOT NULL DEFAULT 'MEMBERS', "relatedType" TEXT, "relatedId" UUID,
  "videoRoomKey" TEXT, "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollaborationChannel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CollaborationChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "CollaborationChannel_publicId_key" ON "CollaborationChannel"("publicId");
CREATE UNIQUE INDEX "CollaborationChannel_videoRoomKey_key" ON "CollaborationChannel"("videoRoomKey");
CREATE UNIQUE INDEX "CollaborationChannel_organizationId_name_key" ON "CollaborationChannel"("organizationId","name");
CREATE INDEX "CollaborationChannel_organizationId_channelType_archivedAt_idx" ON "CollaborationChannel"("organizationId","channelType","archivedAt");

CREATE TABLE "CollaborationMessage" (
  "id" UUID NOT NULL, "publicId" TEXT NOT NULL, "channelId" UUID NOT NULL, "authorUserId" UUID,
  "contactId" UUID, "body" TEXT NOT NULL, "messageType" TEXT NOT NULL DEFAULT 'TEXT',
  "metadata" JSONB NOT NULL DEFAULT '{}', "editedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CollaborationMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "CollaborationChannel"("id") ON DELETE CASCADE,
  CONSTRAINT "CollaborationMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "CollaborationMessage_publicId_key" ON "CollaborationMessage"("publicId");
CREATE INDEX "CollaborationMessage_channelId_createdAt_idx" ON "CollaborationMessage"("channelId","createdAt");

CREATE TABLE "PlatformSupportTicket" (
  "id" UUID NOT NULL, "publicId" TEXT NOT NULL, "organizationId" UUID NOT NULL, "openedById" UUID,
  "assignedAdminId" UUID, "subject" TEXT NOT NULL, "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL', "status" TEXT NOT NULL DEFAULT 'OPEN',
  "metadata" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "closedAt" TIMESTAMP(3),
  CONSTRAINT "PlatformSupportTicket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformSupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "PlatformSupportTicket_publicId_key" ON "PlatformSupportTicket"("publicId");
CREATE INDEX "PlatformSupportTicket_organizationId_status_updatedAt_idx" ON "PlatformSupportTicket"("organizationId","status","updatedAt");
CREATE INDEX "PlatformSupportTicket_assignedAdminId_status_idx" ON "PlatformSupportTicket"("assignedAdminId","status");

CREATE TABLE "PlatformSupportMessage" (
  "id" UUID NOT NULL, "ticketId" UUID NOT NULL, "authorUserId" UUID, "authorType" TEXT NOT NULL,
  "body" TEXT NOT NULL, "internalOnly" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSupportMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformSupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "PlatformSupportTicket"("id") ON DELETE CASCADE,
  CONSTRAINT "PlatformSupportMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL
);
CREATE INDEX "PlatformSupportMessage_ticketId_createdAt_idx" ON "PlatformSupportMessage"("ticketId","createdAt");

CREATE TABLE "PaymentProviderConnection" (
  "id" UUID NOT NULL, "publicId" TEXT NOT NULL, "organizationId" UUID NOT NULL, "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED', "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "externalAccountId" TEXT, "merchantId" TEXT, "encryptedAccessToken" TEXT, "encryptedRefreshToken" TEXT,
  "tokenExpiresAt" TIMESTAMP(3), "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentProviderConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentProviderConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "PaymentProviderConnection_publicId_key" ON "PaymentProviderConnection"("publicId");
CREATE UNIQUE INDEX "PaymentProviderConnection_organizationId_provider_key" ON "PaymentProviderConnection"("organizationId","provider");
CREATE INDEX "PaymentProviderConnection_organizationId_status_idx" ON "PaymentProviderConnection"("organizationId","status");

CREATE TABLE "PaymentTransaction" (
  "id" UUID NOT NULL, "publicId" TEXT NOT NULL, "organizationId" UUID NOT NULL, "providerConnectionId" UUID,
  "provider" TEXT NOT NULL, "invoiceId" UUID, "bookingId" UUID, "contactId" UUID,
  "amountCents" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD', "status" TEXT NOT NULL DEFAULT 'PENDING',
  "externalCheckoutId" TEXT, "externalPaymentId" TEXT, "checkoutUrl" TEXT,
  "providerPayload" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentTransaction_providerConnectionId_fkey" FOREIGN KEY ("providerConnectionId") REFERENCES "PaymentProviderConnection"("id") ON DELETE SET NULL
);
CREATE UNIQUE INDEX "PaymentTransaction_publicId_key" ON "PaymentTransaction"("publicId");
CREATE INDEX "PaymentTransaction_organizationId_status_createdAt_idx" ON "PaymentTransaction"("organizationId","status","createdAt");
CREATE INDEX "PaymentTransaction_provider_externalPaymentId_idx" ON "PaymentTransaction"("provider","externalPaymentId");

CREATE TABLE "AdminActionLog" (
  "id" UUID NOT NULL, "actorUserId" UUID NOT NULL, "organizationId" UUID, "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL, "resourceId" TEXT, "reason" TEXT, "beforeJson" JSONB, "afterJson" JSONB,
  "requestId" TEXT, "ipAddress" TEXT, "userAgent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminActionLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "AdminActionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL
);
CREATE INDEX "AdminActionLog_organizationId_createdAt_idx" ON "AdminActionLog"("organizationId","createdAt");
CREATE INDEX "AdminActionLog_actorUserId_createdAt_idx" ON "AdminActionLog"("actorUserId","createdAt");
CREATE INDEX "AdminActionLog_action_createdAt_idx" ON "AdminActionLog"("action","createdAt");

CREATE TABLE "OAuthState" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "provider" TEXT NOT NULL, "nonce" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OAuthState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "OAuthState_nonce_key" ON "OAuthState"("nonce");
CREATE INDEX "OAuthState_provider_expiresAt_usedAt_idx" ON "OAuthState"("provider","expiresAt","usedAt");

CREATE TABLE "AiConversation" (
    "id" UUID NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "websiteId" UUID,
    "userId" UUID,
    "title" TEXT NOT NULL,
    "contextJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "responseId" TEXT,
    "usageJson" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DataLink" (
    "id" UUID NOT NULL,
    "publicId" TEXT NOT NULL,
    "organizationId" UUID NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadataJson" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DataLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoragePolicy" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "retentionClass" TEXT NOT NULL DEFAULT 'STANDARD',
    "maxFileSizeBytes" BIGINT NOT NULL DEFAULT 26214400,
    "allowedTypesJson" JSONB NOT NULL DEFAULT '[]',
    "publicAssets" BOOLEAN NOT NULL DEFAULT false,
    "versioning" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoragePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiConversation_publicId_key" ON "AiConversation"("publicId");
CREATE INDEX "AiConversation_organizationId_updatedAt_idx" ON "AiConversation"("organizationId", "updatedAt");
CREATE INDEX "AiConversation_websiteId_updatedAt_idx" ON "AiConversation"("websiteId", "updatedAt");
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
CREATE UNIQUE INDEX "DataLink_publicId_key" ON "DataLink"("publicId");
CREATE UNIQUE INDEX "DataLink_organizationId_sourceType_sourceId_targetType_targetId_relationship_key" ON "DataLink"("organizationId", "sourceType", "sourceId", "targetType", "targetId", "relationship");
CREATE INDEX "DataLink_organizationId_sourceType_targetType_active_idx" ON "DataLink"("organizationId", "sourceType", "targetType", "active");
CREATE UNIQUE INDEX "StoragePolicy_organizationId_scope_key" ON "StoragePolicy"("organizationId", "scope");
CREATE INDEX "StoragePolicy_organizationId_scope_idx" ON "StoragePolicy"("organizationId", "scope");

ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataLink" ADD CONSTRAINT "DataLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoragePolicy" ADD CONSTRAINT "StoragePolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StoragePolicy" ("id", "organizationId", "scope", "retentionClass", "maxFileSizeBytes", "allowedTypesJson", "publicAssets", "versioning", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 'WEBSITE_ASSETS', 'STANDARD', 52428800,
  '["image/png","image/jpeg","image/webp","image/gif","image/svg+xml","font/woff","font/woff2","text/css","application/javascript","application/json"]'::jsonb,
  true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization";

INSERT INTO "StoragePolicy" ("id", "organizationId", "scope", "retentionClass", "maxFileSizeBytes", "allowedTypesJson", "publicAssets", "versioning", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 'DOCUMENTS', 'STANDARD', 26214400,
  '["application/pdf","image/png","image/jpeg","text/csv","text/plain","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]'::jsonb,
  false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Organization";

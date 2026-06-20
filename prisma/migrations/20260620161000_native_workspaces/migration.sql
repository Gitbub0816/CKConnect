-- Native dashboard, calendar, collaboration, and website workspace persistence.
ALTER TABLE "CalendarEvent"
  ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "color" TEXT,
  ADD COLUMN "recurrenceJson" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "conferencingJson" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "sourceProvider" TEXT NOT NULL DEFAULT 'CLEARKEY',
  ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "CalendarEvent_organizationId_sourceProvider_externalId_key"
  ON "CalendarEvent"("organizationId", "sourceProvider", "externalId");

ALTER TABLE "CollaborationMessage"
  ADD COLUMN "attachmentsJson" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "parentMessageId" UUID;

ALTER TABLE "CollaborationMessage"
  ADD CONSTRAINT "CollaborationMessage_parentMessageId_fkey"
  FOREIGN KEY ("parentMessageId") REFERENCES "CollaborationMessage"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "CollaborationMessage_parentMessageId_createdAt_idx"
  ON "CollaborationMessage"("parentMessageId", "createdAt");

CREATE TABLE "CollaborationReaction" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborationReaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CollaborationReaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CollaborationReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CollaborationMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CollaborationReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CollaborationReaction_messageId_userId_emoji_key"
  ON "CollaborationReaction"("messageId", "userId", "emoji");
CREATE INDEX "CollaborationReaction_organizationId_createdAt_idx"
  ON "CollaborationReaction"("organizationId", "createdAt");

ALTER TABLE "Website"
  ADD COLUMN "builderType" TEXT NOT NULL DEFAULT 'CONNECT',
  ADD COLUMN "editorJson" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "WebsiteVersion" (
  "id" UUID NOT NULL,
  "websiteId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "label" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "snapshotJson" JSONB NOT NULL,
  "changeSummary" TEXT,
  "authorUserId" UUID,
  "publishedAt" TIMESTAMP(3),
  "scheduledFor" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteVersion_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WebsiteVersion_websiteId_versionNumber_key"
  ON "WebsiteVersion"("websiteId", "versionNumber");
CREATE INDEX "WebsiteVersion_websiteId_status_createdAt_idx"
  ON "WebsiteVersion"("websiteId", "status", "createdAt");

CREATE TABLE "DashboardDefinition" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "userId" UUID,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "dateRange" TEXT NOT NULL DEFAULT '30d',
  "comparison" TEXT NOT NULL DEFAULT 'prior_period',
  "refreshMinutes" INTEGER NOT NULL DEFAULT 0,
  "layoutJson" JSONB NOT NULL DEFAULT '{}',
  "themeJson" JSONB NOT NULL DEFAULT '{}',
  "shared" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DashboardDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DashboardDefinition_organizationId_userId_name_key"
  ON "DashboardDefinition"("organizationId", "userId", "name");
CREATE INDEX "DashboardDefinition_organizationId_shared_updatedAt_idx"
  ON "DashboardDefinition"("organizationId", "shared", "updatedAt");

CREATE TABLE "DashboardWidget" (
  "id" UUID NOT NULL,
  "dashboardId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "chartType" TEXT NOT NULL DEFAULT 'kpi',
  "position" INTEGER NOT NULL,
  "configJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DashboardWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "DashboardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DashboardWidget_dashboardId_position_key"
  ON "DashboardWidget"("dashboardId", "position");
CREATE INDEX "DashboardWidget_dashboardId_metricKey_idx"
  ON "DashboardWidget"("dashboardId", "metricKey");

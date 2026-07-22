-- AlterTable
ALTER TABLE "OrganizationMembership" ADD COLUMN "displayName" TEXT;

-- CreateTable
CREATE TABLE "ActivityRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "verifierMembershipId" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "activityDate" DATETIME,
    "startTime" TEXT,
    "endTime" TEXT,
    "breakMinutes" INTEGER,
    "totalHours" REAL,
    "weeklyHours" REAL,
    "monthlyHours" REAL,
    "paidStatus" TEXT,
    "locationType" TEXT,
    "transportationProvided" BOOLEAN NOT NULL DEFAULT false,
    "supervisorName" TEXT,
    "supervisorTitle" TEXT,
    "supportingNotes" TEXT,
    "status" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityRecord_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityRecord_verifierMembershipId_fkey" FOREIGN KEY ("verifierMembershipId") REFERENCES "OrganizationMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityRecord_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "ActivityRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityRecordId" TEXT NOT NULL,
    "confirmedByUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecordConfirmation_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordConfirmation_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordDispute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityRecordId" TEXT NOT NULL,
    "raisedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "RecordDispute_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordDispute_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FraudReviewFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityRecordId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FraudReviewFlag_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "activityRecordId" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "organizationId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "priorStatus" TEXT,
    "newStatus" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "correlationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRecord_supersedesId_key" ON "ActivityRecord"("supersedesId");

-- CreateIndex
CREATE INDEX "ActivityRecord_participantProfileId_idx" ON "ActivityRecord"("participantProfileId");

-- CreateIndex
CREATE INDEX "ActivityRecord_organizationId_idx" ON "ActivityRecord"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "county" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgencyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenefitProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "requiredHoursPerMonth" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenefitProgram_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParticipantCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantProfileId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "benefitProgramId" TEXT NOT NULL,
    "caseNumberEncrypted" TEXT NOT NULL,
    "caseNumberLast4" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParticipantCase_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParticipantCase_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParticipantCase_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "BenefitProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantCaseId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'HOURS_VERIFICATION',
    "grantedByUserId" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "Consent_participantCaseId_fkey" FOREIGN KEY ("participantCaseId") REFERENCES "ParticipantCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Consent_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APIClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "APIClient_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APIRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiClientId" TEXT,
    "clientIdAttempted" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "participantCaseId" TEXT,
    "outcome" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "APIRequest_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "APIClient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "APIRequest_participantCaseId_fkey" FOREIGN KEY ("participantCaseId") REFERENCES "ParticipantCase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulkQueryJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "benefitProgramId" TEXT NOT NULL,
    "requestedByMembershipId" TEXT NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "includedCount" INTEGER NOT NULL,
    "excludedCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "BulkQueryJob_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BulkQueryJob_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "BenefitProgram" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BulkQueryJob_requestedByMembershipId_fkey" FOREIGN KEY ("requestedByMembershipId") REFERENCES "AgencyMembership" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulkQueryResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bulkQueryJobId" TEXT NOT NULL,
    "participantCaseId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL,
    "excludedReason" TEXT,
    "hoursConfirmed" REAL,
    "hoursRequired" REAL,
    "meetsRequirement" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BulkQueryResult_bulkQueryJobId_fkey" FOREIGN KEY ("bulkQueryJobId") REFERENCES "BulkQueryJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BulkQueryResult_participantCaseId_fkey" FOREIGN KEY ("participantCaseId") REFERENCES "ParticipantCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "organizationId" TEXT,
    "agencyId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "priorStatus" TEXT,
    "newStatus" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "correlationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "actorUserId", "correlationId", "createdAt", "id", "newStatus", "organizationId", "priorStatus", "source", "targetId", "targetType") SELECT "action", "actorUserId", "correlationId", "createdAt", "id", "newStatus", "organizationId", "priorStatus", "source", "targetId", "targetType" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AgencyMembership_userId_idx" ON "AgencyMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyMembership_agencyId_userId_key" ON "AgencyMembership"("agencyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitProgram_agencyId_code_key" ON "BenefitProgram"("agencyId", "code");

-- CreateIndex
CREATE INDEX "ParticipantCase_participantProfileId_idx" ON "ParticipantCase"("participantProfileId");

-- CreateIndex
CREATE INDEX "ParticipantCase_agencyId_idx" ON "ParticipantCase"("agencyId");

-- CreateIndex
CREATE INDEX "ParticipantCase_benefitProgramId_idx" ON "ParticipantCase"("benefitProgramId");

-- CreateIndex
CREATE UNIQUE INDEX "Consent_participantCaseId_key" ON "Consent"("participantCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "APIClient_clientId_key" ON "APIClient"("clientId");

-- CreateIndex
CREATE INDEX "APIRequest_apiClientId_idx" ON "APIRequest"("apiClientId");

-- CreateIndex
CREATE INDEX "APIRequest_createdAt_idx" ON "APIRequest"("createdAt");

-- CreateIndex
CREATE INDEX "BulkQueryJob_agencyId_idx" ON "BulkQueryJob"("agencyId");

-- CreateIndex
CREATE INDEX "BulkQueryResult_bulkQueryJobId_idx" ON "BulkQueryResult"("bulkQueryJobId");

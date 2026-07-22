-- AlterTable
ALTER TABLE "OrganizationMembership" ADD COLUMN "firstApprovalAt" DATETIME;
ALTER TABLE "OrganizationMembership" ADD COLUMN "firstApprovalTargetId" TEXT;
ALTER TABLE "OrganizationMembership" ADD COLUMN "firstApprovalTargetType" TEXT;
ALTER TABLE "OrganizationMembership" ADD COLUMN "ratifiedAt" DATETIME;
ALTER TABLE "OrganizationMembership" ADD COLUMN "ratifiedByUserId" TEXT;

-- CreateTable
CREATE TABLE "OrganizationDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "allowAutoJoin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" DATETIME,
    CONSTRAINT "OrganizationDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrganizationLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VolunteerOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "taskCategory" TEXT,
    "contactPerson" TEXT,
    "minimumAge" INTEGER,
    "accessibilityInfo" TEXT,
    "transportationInfo" TEXT,
    "backgroundCheckRequired" BOOLEAN NOT NULL DEFAULT false,
    "trainingRequired" BOOLEAN NOT NULL DEFAULT false,
    "remoteOrInPerson" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VolunteerOpportunity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpportunitySignup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "participantProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "signedUpAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" DATETIME,
    CONSTRAINT "OpportunitySignup_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "VolunteerOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OpportunitySignup_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QRIdentifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerType" TEXT NOT NULL,
    "participantProfileId" TEXT,
    "organizationId" TEXT,
    "locationId" TEXT,
    "opportunityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "QRIdentifier_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QRIdentifier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QRIdentifier_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QRIdentifier_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "VolunteerOpportunity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_QRIdentifier" ("createdAt", "id", "organizationId", "ownerType", "participantProfileId", "revokedAt") SELECT "createdAt", "id", "organizationId", "ownerType", "participantProfileId", "revokedAt" FROM "QRIdentifier";
DROP TABLE "QRIdentifier";
ALTER TABLE "new_QRIdentifier" RENAME TO "QRIdentifier";
CREATE UNIQUE INDEX "QRIdentifier_participantProfileId_key" ON "QRIdentifier"("participantProfileId");
CREATE UNIQUE INDEX "QRIdentifier_organizationId_key" ON "QRIdentifier"("organizationId");
CREATE UNIQUE INDEX "QRIdentifier_locationId_key" ON "QRIdentifier"("locationId");
CREATE UNIQUE INDEX "QRIdentifier_opportunityId_key" ON "QRIdentifier"("opportunityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_organizationId_domain_key" ON "OrganizationDomain"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "VolunteerOpportunity_organizationId_idx" ON "VolunteerOpportunity"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySignup_opportunityId_participantProfileId_key" ON "OpportunitySignup"("opportunityId", "participantProfileId");

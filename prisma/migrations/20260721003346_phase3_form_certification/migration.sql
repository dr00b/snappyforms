-- CreateTable
CREATE TABLE "FormCertificationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateKey" TEXT NOT NULL,
    "participantProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "verifierMembershipId" TEXT,
    "status" TEXT NOT NULL,
    "changeRequestMessage" TEXT,
    "participantFullName" TEXT NOT NULL,
    "participantDob" TEXT NOT NULL,
    "participantAddress" TEXT NOT NULL,
    "participantCity" TEXT NOT NULL,
    "participantState" TEXT NOT NULL,
    "participantZip" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "agencyPhone" TEXT NOT NULL,
    "agencyAddress" TEXT NOT NULL,
    "agencyCity" TEXT NOT NULL,
    "agencyState" TEXT NOT NULL,
    "agencyZip" TEXT NOT NULL,
    "serviceStartDate" TEXT NOT NULL,
    "serviceEndDate" TEXT NOT NULL,
    "transportationProvided" BOOLEAN NOT NULL DEFAULT false,
    "week1Hours" REAL NOT NULL,
    "week2Hours" REAL NOT NULL,
    "week3Hours" REAL NOT NULL,
    "week4Hours" REAL NOT NULL,
    "tasks" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "siteManagerName" TEXT,
    "siteManagerTitle" TEXT,
    "confirmationDate" TEXT,
    "signature" TEXT,
    "certifiedByUserId" TEXT,
    "certifiedAt" DATETIME,
    "generatedFormId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormCertificationRequest_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormCertificationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormCertificationRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FormCertificationRequest_verifierMembershipId_fkey" FOREIGN KEY ("verifierMembershipId") REFERENCES "OrganizationMembership" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FormCertificationRequest_certifiedByUserId_fkey" FOREIGN KEY ("certifiedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FormCertificationRequest_generatedFormId_fkey" FOREIGN KEY ("generatedFormId") REFERENCES "GeneratedForm" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FormCertificationRequest_generatedFormId_key" ON "FormCertificationRequest"("generatedFormId");

-- CreateIndex
CREATE INDEX "FormCertificationRequest_participantProfileId_idx" ON "FormCertificationRequest"("participantProfileId");

-- CreateIndex
CREATE INDEX "FormCertificationRequest_organizationId_idx" ON "FormCertificationRequest"("organizationId");

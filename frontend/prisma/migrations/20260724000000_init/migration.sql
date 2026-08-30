-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthenticationMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthenticationMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handle" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayValue" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "participantProfileId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT 'teal',
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "showFullNameOnVerification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "website" TEXT,
    "primaryEmail" TEXT NOT NULL,
    "domain" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "taxStatus" TEXT,
    "einDemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstApprovalTargetType" TEXT,
    "firstApprovalTargetId" TEXT,
    "firstApprovalAt" TIMESTAMP(3),
    "ratifiedByUserId" TEXT,
    "ratifiedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRIdentifier" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "participantProfileId" TEXT,
    "organizationId" TEXT,
    "locationId" TEXT,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "QRIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevNotification" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "toIdentifier" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRecord" (
    "id" TEXT NOT NULL,
    "participantProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "verifierMembershipId" TEXT,
    "initiatedBy" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "activityDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "breakMinutes" INTEGER,
    "totalHours" DOUBLE PRECISION,
    "weeklyHours" DOUBLE PRECISION,
    "monthlyHours" DOUBLE PRECISION,
    "paidStatus" TEXT,
    "locationType" TEXT,
    "transportationProvided" BOOLEAN NOT NULL DEFAULT false,
    "supervisorName" TEXT,
    "supervisorTitle" TEXT,
    "supportingNotes" TEXT,
    "status" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordConfirmation" (
    "id" TEXT NOT NULL,
    "activityRecordId" TEXT NOT NULL,
    "confirmedByUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordDispute" (
    "id" TEXT NOT NULL,
    "activityRecordId" TEXT NOT NULL,
    "raisedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RecordDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudReviewFlag" (
    "id" TEXT NOT NULL,
    "activityRecordId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudReviewFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "activityRecordId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedForm" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "participantProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "sourceRecordIds" TEXT NOT NULL,
    "fieldsSnapshot" TEXT NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormCertificationRequest" (
    "id" TEXT NOT NULL,
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
    "week1Hours" DOUBLE PRECISION NOT NULL,
    "week2Hours" DOUBLE PRECISION NOT NULL,
    "week3Hours" DOUBLE PRECISION NOT NULL,
    "week4Hours" DOUBLE PRECISION NOT NULL,
    "tasks" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "siteManagerName" TEXT,
    "siteManagerTitle" TEXT,
    "confirmationDate" TEXT,
    "signature" TEXT,
    "certifiedByUserId" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "generatedFormId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormCertificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationDomain" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "allowAutoJoin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "OrganizationDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerOpportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySignup" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "participantProfileId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "signedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" TIMESTAMP(3),

    CONSTRAINT "OpportunitySignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "county" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyMembership" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitProgram" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "requiredHoursPerMonth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenefitProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantCase" (
    "id" TEXT NOT NULL,
    "participantProfileId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "benefitProgramId" TEXT NOT NULL,
    "caseNumberEncrypted" TEXT NOT NULL,
    "caseNumberLast4" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "participantCaseId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'HOURS_VERIFICATION',
    "grantedByUserId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIClient" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "APIClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIRequest" (
    "id" TEXT NOT NULL,
    "apiClientId" TEXT,
    "clientIdAttempted" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "participantCaseId" TEXT,
    "outcome" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkQueryJob" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "benefitProgramId" TEXT NOT NULL,
    "requestedByMembershipId" TEXT NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "includedCount" INTEGER NOT NULL,
    "excludedCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BulkQueryJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkQueryResult" (
    "id" TEXT NOT NULL,
    "bulkQueryJobId" TEXT NOT NULL,
    "participantCaseId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL,
    "excludedReason" TEXT,
    "hoursConfirmed" DOUBLE PRECISION,
    "hoursRequired" DOUBLE PRECISION,
    "meetsRequirement" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkQueryResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "AuthenticationMethod_identifier_idx" ON "AuthenticationMethod"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "AuthenticationMethod_userId_type_identifier_key" ON "AuthenticationMethod"("userId", "type", "identifier");

-- CreateIndex
CREATE INDEX "VerificationCode_identifier_purpose_idx" ON "VerificationCode"("identifier", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Handle_value_key" ON "Handle"("value");

-- CreateIndex
CREATE UNIQUE INDEX "Handle_participantProfileId_key" ON "Handle"("participantProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Handle_organizationId_key" ON "Handle"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantProfile_userId_key" ON "ParticipantProfile"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "QRIdentifier_participantProfileId_key" ON "QRIdentifier"("participantProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "QRIdentifier_organizationId_key" ON "QRIdentifier"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "QRIdentifier_locationId_key" ON "QRIdentifier"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "QRIdentifier_opportunityId_key" ON "QRIdentifier"("opportunityId");

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

-- CreateIndex
CREATE INDEX "GeneratedForm_participantProfileId_idx" ON "GeneratedForm"("participantProfileId");

-- CreateIndex
CREATE INDEX "ShareLink_ownerUserId_idx" ON "ShareLink"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FormCertificationRequest_generatedFormId_key" ON "FormCertificationRequest"("generatedFormId");

-- CreateIndex
CREATE INDEX "FormCertificationRequest_participantProfileId_idx" ON "FormCertificationRequest"("participantProfileId");

-- CreateIndex
CREATE INDEX "FormCertificationRequest_organizationId_idx" ON "FormCertificationRequest"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_organizationId_domain_key" ON "OrganizationDomain"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "VolunteerOpportunity_organizationId_idx" ON "VolunteerOpportunity"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySignup_opportunityId_participantProfileId_key" ON "OpportunitySignup"("opportunityId", "participantProfileId");

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

-- AddForeignKey
ALTER TABLE "AuthenticationMethod" ADD CONSTRAINT "AuthenticationMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handle" ADD CONSTRAINT "Handle_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handle" ADD CONSTRAINT "Handle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantProfile" ADD CONSTRAINT "ParticipantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRIdentifier" ADD CONSTRAINT "QRIdentifier_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRIdentifier" ADD CONSTRAINT "QRIdentifier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRIdentifier" ADD CONSTRAINT "QRIdentifier_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRIdentifier" ADD CONSTRAINT "QRIdentifier_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "VolunteerOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRecord" ADD CONSTRAINT "ActivityRecord_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRecord" ADD CONSTRAINT "ActivityRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRecord" ADD CONSTRAINT "ActivityRecord_verifierMembershipId_fkey" FOREIGN KEY ("verifierMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityRecord" ADD CONSTRAINT "ActivityRecord_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "ActivityRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordConfirmation" ADD CONSTRAINT "RecordConfirmation_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordConfirmation" ADD CONSTRAINT "RecordConfirmation_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordDispute" ADD CONSTRAINT "RecordDispute_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordDispute" ADD CONSTRAINT "RecordDispute_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudReviewFlag" ADD CONSTRAINT "FraudReviewFlag_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedForm" ADD CONSTRAINT "GeneratedForm_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedForm" ADD CONSTRAINT "GeneratedForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedForm" ADD CONSTRAINT "GeneratedForm_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormCertificationRequest" ADD CONSTRAINT "FormCertificationRequest_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormCertificationRequest" ADD CONSTRAINT "FormCertificationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormCertificationRequest" ADD CONSTRAINT "FormCertificationRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormCertificationRequest" ADD CONSTRAINT "FormCertificationRequest_verifierMembershipId_fkey" FOREIGN KEY ("verifierMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormCertificationRequest" ADD CONSTRAINT "FormCertificationRequest_certifiedByUserId_fkey" FOREIGN KEY ("certifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormCertificationRequest" ADD CONSTRAINT "FormCertificationRequest_generatedFormId_fkey" FOREIGN KEY ("generatedFormId") REFERENCES "GeneratedForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDomain" ADD CONSTRAINT "OrganizationDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLocation" ADD CONSTRAINT "OrganizationLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerOpportunity" ADD CONSTRAINT "VolunteerOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerOpportunity" ADD CONSTRAINT "VolunteerOpportunity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySignup" ADD CONSTRAINT "OpportunitySignup_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "VolunteerOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySignup" ADD CONSTRAINT "OpportunitySignup_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyMembership" ADD CONSTRAINT "AgencyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitProgram" ADD CONSTRAINT "BenefitProgram_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantCase" ADD CONSTRAINT "ParticipantCase_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantCase" ADD CONSTRAINT "ParticipantCase_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantCase" ADD CONSTRAINT "ParticipantCase_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "BenefitProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_participantCaseId_fkey" FOREIGN KEY ("participantCaseId") REFERENCES "ParticipantCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIClient" ADD CONSTRAINT "APIClient_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIRequest" ADD CONSTRAINT "APIRequest_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "APIClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIRequest" ADD CONSTRAINT "APIRequest_participantCaseId_fkey" FOREIGN KEY ("participantCaseId") REFERENCES "ParticipantCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkQueryJob" ADD CONSTRAINT "BulkQueryJob_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkQueryJob" ADD CONSTRAINT "BulkQueryJob_benefitProgramId_fkey" FOREIGN KEY ("benefitProgramId") REFERENCES "BenefitProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkQueryJob" ADD CONSTRAINT "BulkQueryJob_requestedByMembershipId_fkey" FOREIGN KEY ("requestedByMembershipId") REFERENCES "AgencyMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkQueryResult" ADD CONSTRAINT "BulkQueryResult_bulkQueryJobId_fkey" FOREIGN KEY ("bulkQueryJobId") REFERENCES "BulkQueryJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkQueryResult" ADD CONSTRAINT "BulkQueryResult_participantCaseId_fkey" FOREIGN KEY ("participantCaseId") REFERENCES "ParticipantCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;


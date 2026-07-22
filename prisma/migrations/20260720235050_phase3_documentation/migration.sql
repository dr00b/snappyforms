-- CreateTable
CREATE TABLE "GeneratedForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateKey" TEXT NOT NULL,
    "participantProfileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "sourceRecordIds" TEXT NOT NULL,
    "fieldsSnapshot" TEXT NOT NULL,
    "pdfBytes" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedForm_participantProfileId_fkey" FOREIGN KEY ("participantProfileId") REFERENCES "ParticipantProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedForm_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedForm_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" DATETIME,
    CONSTRAINT "ShareLink_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ParticipantProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT 'teal',
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "showFullNameOnVerification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParticipantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ParticipantProfile" ("avatarColor", "bio", "createdAt", "displayName", "id", "searchable", "updatedAt", "userId") SELECT "avatarColor", "bio", "createdAt", "displayName", "id", "searchable", "updatedAt", "userId" FROM "ParticipantProfile";
DROP TABLE "ParticipantProfile";
ALTER TABLE "new_ParticipantProfile" RENAME TO "ParticipantProfile";
CREATE UNIQUE INDEX "ParticipantProfile_userId_key" ON "ParticipantProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GeneratedForm_participantProfileId_idx" ON "GeneratedForm"("participantProfileId");

-- CreateIndex
CREATE INDEX "ShareLink_ownerUserId_idx" ON "ShareLink"("ownerUserId");

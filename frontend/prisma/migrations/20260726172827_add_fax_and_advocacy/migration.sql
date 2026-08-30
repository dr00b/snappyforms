-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "faxNumber" TEXT;

-- CreateTable
CREATE TABLE "FaxTransmission" (
    "id" TEXT NOT NULL,
    "generatedFormId" TEXT NOT NULL,
    "sentByUserId" TEXT NOT NULL,
    "participantCaseId" TEXT,
    "destinationName" TEXT NOT NULL,
    "destinationFax" TEXT NOT NULL,
    "caseNumberLast4" TEXT,
    "pageCount" INTEGER NOT NULL,
    "confirmationNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "pdfBytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaxTransmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvocacyMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "faxTransmissionId" TEXT,
    "zip" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientOffice" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvocacyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaxTransmission_confirmationNumber_key" ON "FaxTransmission"("confirmationNumber");

-- CreateIndex
CREATE INDEX "FaxTransmission_generatedFormId_idx" ON "FaxTransmission"("generatedFormId");

-- CreateIndex
CREATE INDEX "FaxTransmission_sentByUserId_idx" ON "FaxTransmission"("sentByUserId");

-- CreateIndex
CREATE INDEX "AdvocacyMessage_userId_idx" ON "AdvocacyMessage"("userId");

-- AddForeignKey
ALTER TABLE "FaxTransmission" ADD CONSTRAINT "FaxTransmission_generatedFormId_fkey" FOREIGN KEY ("generatedFormId") REFERENCES "GeneratedForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxTransmission" ADD CONSTRAINT "FaxTransmission_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaxTransmission" ADD CONSTRAINT "FaxTransmission_participantCaseId_fkey" FOREIGN KEY ("participantCaseId") REFERENCES "ParticipantCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvocacyMessage" ADD CONSTRAINT "AdvocacyMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The app container seeds only an empty database, so an already-seeded demo
-- stack would otherwise gain this column as NULL and have nowhere to fax to.
-- Every agency in this prototype is meant to be reachable by fax.
UPDATE "Agency" SET "faxNumber" = '555-010-4099' WHERE "faxNumber" IS NULL;

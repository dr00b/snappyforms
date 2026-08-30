-- AlterTable
ALTER TABLE "OpportunitySignup" ADD COLUMN     "activityRecordId" TEXT,
ADD COLUMN     "codeHash" TEXT,
ADD COLUMN     "matchedStep" INTEGER;

-- AlterTable
ALTER TABLE "VolunteerOpportunity" ADD COLUMN     "totpSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySignup_activityRecordId_key" ON "OpportunitySignup"("activityRecordId");

-- AddForeignKey
ALTER TABLE "OpportunitySignup" ADD CONSTRAINT "OpportunitySignup_activityRecordId_fkey" FOREIGN KEY ("activityRecordId") REFERENCES "ActivityRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

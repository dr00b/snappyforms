import { db } from "@/lib/db";
import { initials } from "@/lib/utils";

export type VerificationView =
  | {
      status: "valid";
      verificationId: string;
      participantDisplay: string;
      organizationName: string;
      category: string;
      startDate: Date | null;
      endDate: Date | null;
      activityDate: Date | null;
      totalHours: number | null;
      confirmedAt: Date | null;
    }
  | { status: "revoked"; verificationId: string }
  | { status: "superseded"; verificationId: string; supersededById: string | null }
  | { status: "unavailable"; verificationId: string };

export async function getVerificationView(activityRecordId: string): Promise<VerificationView> {
  const record = await db.activityRecord.findUnique({
    where: { id: activityRecordId },
    include: {
      participantProfile: true,
      organization: true,
      confirmations: { where: { action: "CONFIRMED" }, orderBy: { createdAt: "desc" }, take: 1 },
      supersededBy: true,
    },
  });

  if (!record) {
    return { status: "unavailable", verificationId: activityRecordId };
  }

  if (record.status === "REVOKED") {
    return { status: "revoked", verificationId: record.id };
  }

  if (record.status === "SUPERSEDED") {
    return { status: "superseded", verificationId: record.id, supersededById: record.supersededBy?.id ?? null };
  }

  if (record.status !== "CONFIRMED") {
    return { status: "unavailable", verificationId: record.id };
  }

  return {
    status: "valid",
    verificationId: record.id,
    participantDisplay: record.participantProfile.showFullNameOnVerification
      ? record.participantProfile.displayName
      : initials(record.participantProfile.displayName),
    organizationName: record.organization.name,
    category: record.category,
    startDate: record.startDate,
    endDate: record.endDate,
    activityDate: record.activityDate,
    totalHours: record.totalHours,
    confirmedAt: record.confirmations[0]?.createdAt ?? null,
  };
}

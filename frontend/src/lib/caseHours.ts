import { db } from "@/lib/db";

export type CaseHoursView =
  | { status: "no_consent" }
  | { status: "case_not_found" }
  | {
      status: "ok";
      hoursConfirmed: number;
      hoursRequired: number | null;
      meetsRequirement: boolean | null;
      windowStart: Date;
      windowEnd: Date;
    };

/** Consent-gated "hours confirmed this month vs. required" view for a case. Every
 * consent-gated read path (cases list, case detail, bulk query, the external API)
 * goes through this one helper — never re-implement the consent check inline. */
export async function getCaseHoursView(caseId: string): Promise<CaseHoursView> {
  const kase = await db.participantCase.findUnique({
    where: { id: caseId },
    include: { consent: true, benefitProgram: true },
  });
  if (!kase) return { status: "case_not_found" };
  if (!kase.consent || kase.consent.revokedAt) return { status: "no_consent" };

  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const agg = await db.activityRecord.aggregate({
    where: {
      participantProfileId: kase.participantProfileId,
      status: "CONFIRMED",
      activityDate: { gte: windowStart, lt: windowEnd },
    },
    _sum: { totalHours: true },
  });

  const hoursConfirmed = agg._sum.totalHours ?? 0;
  const hoursRequired = kase.benefitProgram.requiredHoursPerMonth;
  return {
    status: "ok",
    hoursConfirmed,
    hoursRequired,
    meetsRequirement: hoursRequired == null ? null : hoursConfirmed >= hoursRequired,
    windowStart,
    windowEnd,
  };
}

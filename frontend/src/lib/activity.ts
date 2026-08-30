import { db } from "@/lib/db";
import type { ActivityRecord } from "@prisma/client";

export { STATUS_LABELS } from "@/lib/activityLabels";

const HIGH_RISK_THRESHOLD_HOURS = 200;
const REPEATED_PAIR_THRESHOLD = 5;
const RECENT_ORG_DAYS = 7;

/** Actions an organization verifier may take on a record in its current status. */
export function verifierActions(status: string): string[] {
  switch (status) {
    case "AWAITING_ORGANIZATION":
      return ["confirm", "decline", "request-changes"];
    case "CONFIRMED":
      return ["revise", "revoke"];
    default:
      return [];
  }
}

/** Actions the owning participant may take on a record in its current status. */
export function participantActions(status: string): string[] {
  switch (status) {
    case "AWAITING_PARTICIPANT":
      return ["accept", "dispute"];
    case "CHANGES_REQUESTED":
      return ["resubmit"];
    case "CONFIRMED":
      return ["dispute"];
    default:
      return [];
  }
}

export async function getActiveMembership(organizationId: string, userId: string) {
  return db.organizationMembership.findFirst({
    where: { organizationId, userId, status: "ACTIVE" },
  });
}

/** Active admin membership, or null — the standard gate for domain/location/opportunity
 * management, suspend/ratify/approve-join, and other admin-only actions. */
export async function getOrgAdminMembership(organizationId: string, userId: string) {
  const membership = await getActiveMembership(organizationId, userId);
  return membership?.role === "ADMIN" ? membership : null;
}

/**
 * PENDING members can already act as verifiers (see the Phase 4 plan's trust
 * model) — only SUSPENDED and REQUESTED (not yet an approved member at all) are
 * excluded. Use this instead of getActiveMembership for confirm/decline/
 * request-changes/revise-type actions; keep getActiveMembership for admin-only
 * actions (suspend, revoke, domain/location/opportunity management, ratify).
 */
export async function getVerifierEligibleMembership(organizationId: string, userId: string) {
  return db.organizationMembership.findFirst({
    where: { organizationId, userId, status: { in: ["ACTIVE", "PENDING"] } },
  });
}

type EligibleMembership = { id: string; status: string; firstApprovalAt: Date | null };

/**
 * Stamps a PENDING member's trust ledger the first time one of their
 * confirm/certify actions succeeds. Never blocks or delays the action itself —
 * purely a side effect an admin later reviews via the "Needs ratification" queue.
 */
export async function recordFirstApprovalIfNeeded(
  membership: EligibleMembership,
  targetType: "ACTIVITY_RECORD" | "FORM_CERTIFICATION_REQUEST",
  targetId: string
) {
  if (membership.status !== "PENDING" || membership.firstApprovalAt) return;
  await db.organizationMembership.update({
    where: { id: membership.id },
    data: {
      firstApprovalTargetType: targetType,
      firstApprovalTargetId: targetId,
      firstApprovalAt: new Date(),
    },
  });
}

type FraudFlagInput = { type: string; message: string };

/**
 * Non-blocking fraud/abuse heuristics from spec section 15. Called at confirm/accept
 * time; results are stored as FraudReviewFlag rows and shown as "needs review" badges
 * — never used to auto-reject a record.
 */
export async function computeFraudFlags(record: ActivityRecord): Promise<FraudFlagInput[]> {
  const flags: FraudFlagInput[] = [];

  const activeStatuses = ["AWAITING_ORGANIZATION", "AWAITING_PARTICIPANT", "CHANGES_REQUESTED", "CONFIRMED"];

  const siblings = await db.activityRecord.findMany({
    where: {
      participantProfileId: record.participantProfileId,
      id: { not: record.id },
      status: { in: activeStatuses },
    },
  });

  const sameOrgSameCategory = siblings.filter(
    (s) => s.organizationId === record.organizationId && s.category === record.category
  );
  if (
    record.activityDate &&
    sameOrgSameCategory.some(
      (s) => s.activityDate && s.activityDate.toDateString() === record.activityDate!.toDateString()
    )
  ) {
    flags.push({
      type: "DUPLICATE",
      message: "Needs review: another record for the same organization, category, and date already exists.",
    });
  }

  if (record.totalHours && record.totalHours > 16 && record.activityDate) {
    flags.push({
      type: "OVER_16_HOURS",
      message: "Unusual activity: more than 16 hours logged for a single day — additional confirmation recommended.",
    });
  }

  if (
    record.activityDate &&
    siblings.some((s) => s.activityDate && s.activityDate.toDateString() === record.activityDate!.toDateString())
  ) {
    flags.push({
      type: "OVERLAPPING",
      message: "Needs review: this participant has another activity logged on the same date.",
    });
  }

  if (record.activityDate) {
    const monthStart = new Date(record.activityDate.getFullYear(), record.activityDate.getMonth(), 1);
    const monthEnd = new Date(record.activityDate.getFullYear(), record.activityDate.getMonth() + 1, 1);
    const monthly = await db.activityRecord.aggregate({
      where: {
        participantProfileId: record.participantProfileId,
        organizationId: record.organizationId,
        activityDate: { gte: monthStart, lt: monthEnd },
        status: { in: activeStatuses },
      },
      _sum: { totalHours: true },
    });
    const total = monthly._sum.totalHours ?? 0;
    if (total > HIGH_RISK_THRESHOLD_HOURS) {
      flags.push({
        type: "HIGH_MONTHLY_HOURS",
        message: `Unusual activity: over ${HIGH_RISK_THRESHOLD_HOURS} hours logged this month for this organization.`,
      });
    }
  }

  const org = await db.organization.findUnique({ where: { id: record.organizationId } });
  if (org) {
    const ageDays = (Date.now() - org.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < RECENT_ORG_DAYS) {
      flags.push({
        type: "RECENT_ORG",
        message: "Needs review: this organization was created recently.",
      });
    }
  }

  if (record.verifierMembershipId) {
    const pairCount = await db.activityRecord.count({
      where: {
        participantProfileId: record.participantProfileId,
        verifierMembershipId: record.verifierMembershipId,
        status: "CONFIRMED",
      },
    });
    if (pairCount > REPEATED_PAIR_THRESHOLD) {
      flags.push({
        type: "REPEATED_VERIFIER_PAIR",
        message: "Needs review: this participant and verifier have an unusually high number of confirmed records together.",
      });
    }
  }

  return flags;
}

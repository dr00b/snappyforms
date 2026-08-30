import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationActivityRecordSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership, recordFirstApprovalIfNeeded, computeFraudFlags } from "@/lib/activity";

const LOW_RISK_CATEGORIES = ["VOLUNTEER", "COMMUNITY_SERVICE"];

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = organizationActivityRecordSchema.parse(await request.json());

    const membership = await getVerifierEligibleMembership(body.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_a_member" }, { status: 403 });
    }

    const handle = await db.handle.findUnique({
      where: { value: body.participantHandle },
      include: { participantProfile: true },
    });
    if (!handle || handle.ownerType !== "PARTICIPANT" || !handle.participantProfile) {
      return NextResponse.json({ error: "participant_not_found" }, { status: 404 });
    }

    const immediate = LOW_RISK_CATEGORIES.includes(body.category);
    const { organizationId, participantHandle, ...fields } = body;

    const record = await db.activityRecord.create({
      data: {
        ...fields,
        participantProfileId: handle.participantProfile.id,
        organizationId,
        verifierMembershipId: membership.id,
        initiatedBy: "ORGANIZATION",
        status: immediate ? "CONFIRMED" : "AWAITING_PARTICIPANT",
      },
    });

    if (immediate) {
      await db.recordConfirmation.create({
        data: {
          activityRecordId: record.id,
          confirmedByUserId: session.userId,
          action: "CONFIRMED",
          message: "Auto-confirmed: low-risk volunteer/community-service activity.",
        },
      });
      const flags = await computeFraudFlags(record);
      if (flags.length > 0) {
        await db.fraudReviewFlag.createMany({
          data: flags.map((f) => ({ activityRecordId: record.id, type: f.type, message: f.message })),
        });
      }
      await recordFirstApprovalIfNeeded(membership, "ACTIVITY_RECORD", record.id);
    }

    await logAudit({
      actorUserId: session.userId,
      organizationId,
      action: immediate ? "verification_confirmed" : "record_proposed",
      targetType: "ActivityRecord",
      targetId: record.id,
      newStatus: record.status,
    });

    await notifyUser(handle.participantProfile.userId, {
      type: immediate ? "VERIFICATION_CONFIRMED" : "PROPOSED_RECORD_RECEIVED",
      title: immediate ? "Activity confirmed" : "New activity record to review",
      body: immediate
        ? `${membership.displayName ?? "An organization representative"} confirmed "${record.title}".`
        : `${membership.displayName ?? "An organization representative"} proposed a record: "${record.title}". Review and accept or dispute it.`,
      activityRecordId: record.id,
    });

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return handleApiError(error);
  }
}

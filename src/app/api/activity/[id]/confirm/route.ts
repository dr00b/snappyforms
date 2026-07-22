import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership, recordFirstApprovalIfNeeded, computeFraudFlags, verifierActions } from "@/lib/activity";

const schema = z.object({ acknowledged: z.literal(true) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    schema.parse(await request.json());

    const record = await db.activityRecord.findUnique({
      where: { id: params.id },
      include: { participantProfile: true },
    });
    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!verifierActions(record.status).includes("confirm")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getVerifierEligibleMembership(record.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    const priorStatus = record.status;
    await db.activityRecord.update({ where: { id: record.id }, data: { status: "CONFIRMED" } });
    await db.recordConfirmation.create({
      data: { activityRecordId: record.id, confirmedByUserId: session.userId, action: "CONFIRMED" },
    });
    await recordFirstApprovalIfNeeded(membership, "ACTIVITY_RECORD", record.id);

    const { participantProfile, ...bareRecord } = record;
    const flags = await computeFraudFlags({ ...bareRecord, status: "CONFIRMED" });
    if (flags.length > 0) {
      await db.fraudReviewFlag.createMany({
        data: flags.map((f) => ({ activityRecordId: record.id, type: f.type, message: f.message })),
      });
    }

    await logAudit({
      actorUserId: session.userId,
      organizationId: record.organizationId,
      action: "verification_confirmed",
      targetType: "ActivityRecord",
      targetId: record.id,
      priorStatus,
      newStatus: "CONFIRMED",
    });

    await notifyUser(record.participantProfile.userId, {
      type: "VERIFICATION_CONFIRMED",
      title: "Verification confirmed",
      body: `Your record "${record.title}" has been confirmed and is ready to download or share.`,
      activityRecordId: record.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

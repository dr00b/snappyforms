import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resubmitSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { participantActions } from "@/lib/activity";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const fields = resubmitSchema.parse(await request.json());

    const record = await db.activityRecord.findUnique({ where: { id: params.id } });
    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (record.participantProfileId !== session.user.participantProfile.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!participantActions(record.status).includes("resubmit")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    await db.activityRecord.update({
      where: { id: record.id },
      data: { ...fields, status: "AWAITING_ORGANIZATION" },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: record.organizationId,
      action: "verification_resubmitted",
      targetType: "ActivityRecord",
      targetId: record.id,
      priorStatus: "CHANGES_REQUESTED",
      newStatus: "AWAITING_ORGANIZATION",
    });

    const notifyTargets = record.verifierMembershipId
      ? [await db.organizationMembership.findUnique({ where: { id: record.verifierMembershipId } })]
      : await db.organizationMembership.findMany({
          where: { organizationId: record.organizationId, role: "ADMIN", status: "ACTIVE" },
        });

    for (const membership of notifyTargets) {
      if (!membership) continue;
      await notifyUser(membership.userId, {
        type: "VERIFICATION_REQUESTED",
        title: "Updated verification request",
        body: `"${record.title}" was updated and resubmitted for review.`,
        activityRecordId: record.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

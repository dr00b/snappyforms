import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { disputeSchema } from "@/lib/validation";
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
    const { reason } = disputeSchema.parse(await request.json());

    const record = await db.activityRecord.findUnique({ where: { id: params.id } });
    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (record.participantProfileId !== session.user.participantProfile.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!participantActions(record.status).includes("dispute")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const priorStatus = record.status;
    await db.activityRecord.update({ where: { id: record.id }, data: { status: "DISPUTED" } });
    await db.recordDispute.create({
      data: { activityRecordId: record.id, raisedByUserId: session.userId, reason },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: record.organizationId,
      action: "record_disputed",
      targetType: "ActivityRecord",
      targetId: record.id,
      priorStatus,
      newStatus: "DISPUTED",
    });

    const admins = await db.organizationMembership.findMany({
      where: { organizationId: record.organizationId, role: "ADMIN", status: "ACTIVE" },
    });
    for (const admin of admins) {
      await notifyUser(admin.userId, {
        type: "RECORD_DISPUTED",
        title: "Record disputed",
        body: `A participant disputed "${record.title}": ${reason}`,
        activityRecordId: record.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getActiveMembership, verifierActions } from "@/lib/activity";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const record = await db.activityRecord.findUnique({
      where: { id: params.id },
      include: { participantProfile: true },
    });
    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!verifierActions(record.status).includes("revoke")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getActiveMembership(record.organizationId, session.userId);
    if (membership?.role !== "ADMIN") {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const priorStatus = record.status;
    await db.activityRecord.update({ where: { id: record.id }, data: { status: "REVOKED" } });

    await logAudit({
      actorUserId: session.userId,
      organizationId: record.organizationId,
      action: "record_revoked",
      targetType: "ActivityRecord",
      targetId: record.id,
      priorStatus,
      newStatus: "REVOKED",
    });

    await notifyUser(record.participantProfile.userId, {
      type: "RECORD_REVOKED",
      title: "Record revoked",
      body: `"${record.title}" has been revoked by the verifying organization.`,
      activityRecordId: record.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

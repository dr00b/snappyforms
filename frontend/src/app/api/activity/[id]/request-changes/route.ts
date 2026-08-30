import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestChangesSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership, verifierActions } from "@/lib/activity";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const { message } = requestChangesSchema.parse(await request.json());

    const record = await db.activityRecord.findUnique({
      where: { id: params.id },
      include: { participantProfile: true },
    });
    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!verifierActions(record.status).includes("request-changes")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getVerifierEligibleMembership(record.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    const priorStatus = record.status;
    await db.activityRecord.update({ where: { id: record.id }, data: { status: "CHANGES_REQUESTED" } });
    await db.recordConfirmation.create({
      data: {
        activityRecordId: record.id,
        confirmedByUserId: session.userId,
        action: "CHANGES_REQUESTED",
        message,
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: record.organizationId,
      action: "changes_requested",
      targetType: "ActivityRecord",
      targetId: record.id,
      priorStatus,
      newStatus: "CHANGES_REQUESTED",
    });

    await notifyUser(record.participantProfile.userId, {
      type: "CHANGES_REQUESTED",
      title: "Changes requested",
      body: `Changes were requested on "${record.title}": ${message}`,
      activityRecordId: record.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

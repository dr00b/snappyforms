import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership, verifierActions } from "@/lib/activity";

const schema = z.object({ message: z.string().trim().max(1000).optional() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const { message } = schema.parse(await request.json().catch(() => ({})));

    const record = await db.activityRecord.findUnique({
      where: { id: params.id },
      include: { participantProfile: true },
    });
    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!verifierActions(record.status).includes("decline")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getVerifierEligibleMembership(record.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    const priorStatus = record.status;
    await db.activityRecord.update({ where: { id: record.id }, data: { status: "DECLINED" } });
    await db.recordConfirmation.create({
      data: { activityRecordId: record.id, confirmedByUserId: session.userId, action: "DECLINED", message },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: record.organizationId,
      action: "verification_declined",
      targetType: "ActivityRecord",
      targetId: record.id,
      priorStatus,
      newStatus: "DECLINED",
    });

    await notifyUser(record.participantProfile.userId, {
      type: "VERIFICATION_DECLINED",
      title: "Verification declined",
      body: message
        ? `Your request "${record.title}" was declined: ${message}`
        : `Your request "${record.title}" was declined.`,
      activityRecordId: record.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

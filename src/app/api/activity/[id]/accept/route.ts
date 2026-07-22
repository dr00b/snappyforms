import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { participantActions, computeFraudFlags } from "@/lib/activity";

const schema = z.object({ acknowledged: z.literal(true) });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    schema.parse(await request.json());

    const record = await db.activityRecord.findUnique({ where: { id: params.id } });
    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (record.participantProfileId !== session.user.participantProfile.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!participantActions(record.status).includes("accept")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    await db.activityRecord.update({ where: { id: record.id }, data: { status: "CONFIRMED" } });
    await db.recordConfirmation.create({
      data: {
        activityRecordId: record.id,
        confirmedByUserId: session.userId,
        action: "CONFIRMED",
        message: "Accepted by participant",
      },
    });

    const flags = await computeFraudFlags({ ...record, status: "CONFIRMED" });
    if (flags.length > 0) {
      await db.fraudReviewFlag.createMany({
        data: flags.map((f) => ({ activityRecordId: record.id, type: f.type, message: f.message })),
      });
    }

    await logAudit({
      actorUserId: session.userId,
      organizationId: record.organizationId,
      action: "record_accepted",
      targetType: "ActivityRecord",
      targetId: record.id,
      priorStatus: "AWAITING_PARTICIPANT",
      newStatus: "CONFIRMED",
    });

    if (record.verifierMembershipId) {
      const verifier = await db.organizationMembership.findUnique({ where: { id: record.verifierMembershipId } });
      if (verifier) {
        await notifyUser(verifier.userId, {
          type: "VERIFICATION_CONFIRMED",
          title: "Record accepted",
          body: `The participant accepted the proposed record "${record.title}".`,
          activityRecordId: record.id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

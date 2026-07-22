import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviseSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership, verifierActions, computeFraudFlags } from "@/lib/activity";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const fields = reviseSchema.parse(await request.json());

    const original = await db.activityRecord.findUnique({
      where: { id: params.id },
      include: { participantProfile: true },
    });
    if (!original) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!verifierActions(original.status).includes("revise")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getVerifierEligibleMembership(original.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    const revision = await db.$transaction(async (tx) => {
      await tx.activityRecord.update({ where: { id: original.id }, data: { status: "SUPERSEDED" } });

      const created = await tx.activityRecord.create({
        data: {
          ...fields,
          participantProfileId: original.participantProfileId,
          organizationId: original.organizationId,
          verifierMembershipId: original.verifierMembershipId,
          initiatedBy: original.initiatedBy,
          status: "CONFIRMED",
          revisionNumber: original.revisionNumber + 1,
          supersedesId: original.id,
        },
      });

      await tx.recordConfirmation.create({
        data: {
          activityRecordId: created.id,
          confirmedByUserId: session.userId,
          action: "CONFIRMED",
          message: "Correction to a previously confirmed record",
        },
      });

      return created;
    });

    const flags = await computeFraudFlags(revision);
    if (flags.length > 0) {
      await db.fraudReviewFlag.createMany({
        data: flags.map((f) => ({ activityRecordId: revision.id, type: f.type, message: f.message })),
      });
    }

    await logAudit({
      actorUserId: session.userId,
      organizationId: original.organizationId,
      action: "correction",
      targetType: "ActivityRecord",
      targetId: original.id,
      priorStatus: "CONFIRMED",
      newStatus: "SUPERSEDED",
      correlationId: revision.id,
    });

    await notifyUser(original.participantProfile.userId, {
      type: "RECORD_REVISED",
      title: "Record corrected",
      body: `"${original.title}" was corrected by the verifying organization. A new version is available.`,
      activityRecordId: revision.id,
    });

    return NextResponse.json({ ok: true, record: revision });
  } catch (error) {
    return handleApiError(error);
  }
}

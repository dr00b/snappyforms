import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participantActivityRequestSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!session.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const body = participantActivityRequestSchema.parse(await request.json());

    const organization = await db.organization.findUnique({ where: { id: body.organizationId } });
    if (!organization) {
      return NextResponse.json({ error: "organization_not_found" }, { status: 404 });
    }

    let verifierMembership = null;
    if (body.verifierMembershipId) {
      verifierMembership = await db.organizationMembership.findFirst({
        where: {
          id: body.verifierMembershipId,
          organizationId: body.organizationId,
          status: { in: ["ACTIVE", "PENDING"] },
        },
      });
      if (!verifierMembership) {
        return NextResponse.json({ error: "verifier_unavailable" }, { status: 400 });
      }
    }

    const { organizationId, verifierMembershipId, ...fields } = body;

    const record = await db.activityRecord.create({
      data: {
        ...fields,
        participantProfileId: session.user.participantProfile.id,
        organizationId,
        verifierMembershipId: verifierMembership?.id,
        initiatedBy: "PARTICIPANT",
        status: "AWAITING_ORGANIZATION",
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId,
      action: "verification_requested",
      targetType: "ActivityRecord",
      targetId: record.id,
      newStatus: record.status,
    });

    const notifyTargets = verifierMembership
      ? [verifierMembership]
      : await db.organizationMembership.findMany({
          where: { organizationId, role: "ADMIN", status: "ACTIVE" },
        });

    for (const membership of notifyTargets) {
      await notifyUser(membership.userId, {
        type: "VERIFICATION_REQUESTED",
        title: "New verification request",
        body: `${session.user.participantProfile.displayName} requested verification for "${record.title}".`,
        activityRecordId: record.id,
      });
    }

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return handleApiError(error);
  }
}

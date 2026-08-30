import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const signup = await db.opportunitySignup.findUnique({
      where: {
        opportunityId_participantProfileId: {
          opportunityId: params.id,
          participantProfileId: session.user.participantProfile.id,
        },
      },
    });
    if (!signup) {
      return NextResponse.json({ error: "not_signed_up" }, { status: 404 });
    }

    await db.opportunitySignup.update({ where: { id: signup.id }, data: { status: "CANCELLED" } });

    const opportunity = await db.volunteerOpportunity.findUnique({ where: { id: params.id } });
    await logAudit({
      actorUserId: session.userId,
      organizationId: opportunity?.organizationId,
      action: "opportunity_signup_cancelled",
      targetType: "VolunteerOpportunity",
      targetId: params.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

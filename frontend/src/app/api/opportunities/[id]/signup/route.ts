import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const opportunity = await db.volunteerOpportunity.findUnique({
      where: { id: params.id },
      include: { signups: true },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const existing = opportunity.signups.find((s) => s.participantProfileId === session.user.participantProfile!.id);
    if (existing && existing.status !== "CANCELLED") {
      return NextResponse.json({ ok: true });
    }

    const activeCount = opportunity.signups.filter((s) => s.status !== "CANCELLED").length;
    if (activeCount >= opportunity.openings) {
      return NextResponse.json({ error: "opportunity_full" }, { status: 409 });
    }

    if (existing) {
      await db.opportunitySignup.update({ where: { id: existing.id }, data: { status: "SIGNED_UP", checkedInAt: null } });
    } else {
      await db.opportunitySignup.create({
        data: {
          opportunityId: opportunity.id,
          participantProfileId: session.user.participantProfile.id,
          status: "SIGNED_UP",
        },
      });
    }

    await logAudit({
      actorUserId: session.userId,
      organizationId: opportunity.organizationId,
      action: "opportunity_signup",
      targetType: "VolunteerOpportunity",
      targetId: opportunity.id,
    });

    await notifyUser(session.userId, {
      type: "VERIFICATION_CONFIRMED",
      title: "Signed up",
      body: `You're signed up for "${opportunity.title}".`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

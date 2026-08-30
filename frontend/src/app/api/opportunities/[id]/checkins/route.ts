import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getVerifierEligibleMembership } from "@/lib/activity";

/** Feeds the live "who has checked in" list on the host view. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const opportunity = await db.volunteerOpportunity.findUnique({ where: { id: params.id } });
    if (!opportunity) {
      return NextResponse.json({ error: "shift_not_found" }, { status: 404 });
    }

    const membership = await getVerifierEligibleMembership(
      opportunity.organizationId,
      session.userId
    );
    if (!membership) {
      return NextResponse.json({ error: "not_a_member" }, { status: 403 });
    }

    const signups = await db.opportunitySignup.findMany({
      where: { opportunityId: opportunity.id, NOT: { activityRecordId: null } },
      include: { participantProfile: { include: { handle: true } } },
      orderBy: { checkedInAt: "desc" },
    });

    return NextResponse.json({
      shift: {
        id: opportunity.id,
        title: opportunity.title,
        date: opportunity.date,
        startTime: opportunity.startTime,
        endTime: opportunity.endTime,
      },
      checkins: signups.map((s) => ({
        displayName: s.participantProfile.displayName,
        handle: s.participantProfile.handle?.displayValue ?? null,
        checkedInAt: s.checkedInAt,
        activityRecordId: s.activityRecordId,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

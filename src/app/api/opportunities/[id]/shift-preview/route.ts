import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { verifyCode } from "@/lib/shiftTotp";
import { serializeShiftForVolunteer } from "@/lib/shifts";
export const dynamic = "force-dynamic";

/**
 * What a volunteer sees after scanning, before they confirm. The code is
 * checked first so a stale QR reveals nothing and fails here rather than after
 * the volunteer has read and agreed to the details.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!session.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const code = new URL(request.url).searchParams.get("c") ?? "";

    const opportunity = await db.volunteerOpportunity.findUnique({
      where: { id: params.id },
      include: { organization: true },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "shift_not_found" }, { status: 404 });
    }
    if (!opportunity.totpSecret) {
      return NextResponse.json({ error: "shift_not_hosted" }, { status: 409 });
    }
    if (!verifyCode(opportunity.totpSecret, code).ok) {
      return NextResponse.json({ error: "invalid_code" }, { status: 401 });
    }

    const signup = await db.opportunitySignup.findUnique({
      where: {
        opportunityId_participantProfileId: {
          opportunityId: opportunity.id,
          participantProfileId: session.user.participantProfile.id,
        },
      },
    });

    return NextResponse.json({
      shift: serializeShiftForVolunteer(opportunity),
      alreadyCheckedIn: Boolean(signup?.activityRecordId),
      activityRecordId: signup?.activityRecordId ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

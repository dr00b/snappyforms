import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const cases = await db.participantCase.findMany({
      where: { participantProfileId: session.user.participantProfile.id },
      include: { agency: true, benefitProgram: true, consent: true },
      orderBy: { openedAt: "desc" },
    });

    return NextResponse.json({
      cases: cases.map((kase) => ({
        id: kase.id,
        agencyName: kase.agency.name,
        benefitProgramName: kase.benefitProgram.name,
        status: kase.status,
        hasConsent: Boolean(kase.consent && !kase.consent.revokedAt),
        grantedAt: kase.consent?.revokedAt ? null : kase.consent?.grantedAt ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

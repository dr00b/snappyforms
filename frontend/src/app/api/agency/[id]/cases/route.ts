import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getAgencyMembership } from "@/lib/agency";
import { getCaseHoursView } from "@/lib/caseHours";
import { formatMaskedCaseNumber } from "@/lib/encryption";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const membership = await getAgencyMembership(params.id, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "agency_membership_required" }, { status: 403 });
    }

    const cases = await db.participantCase.findMany({
      where: { agencyId: params.id },
      include: { participantProfile: true, benefitProgram: true, consent: true },
      orderBy: { openedAt: "desc" },
    });

    const enriched = await Promise.all(
      cases.map(async (kase) => {
        const hours = await getCaseHoursView(kase.id);
        return {
          id: kase.id,
          participantName: kase.participantProfile.displayName,
          benefitProgramName: kase.benefitProgram.name,
          maskedCaseNumber: formatMaskedCaseNumber(kase.caseNumberLast4),
          status: kase.status,
          openedAt: kase.openedAt,
          hasConsent: Boolean(kase.consent && !kase.consent.revokedAt),
          hours,
        };
      })
    );

    return NextResponse.json({ cases: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getAgencyMembership } from "@/lib/agency";
import { getCaseHoursView } from "@/lib/caseHours";
import { formatMaskedCaseNumber } from "@/lib/encryption";

export async function GET(
  _request: Request,
  { params }: { params: { id: string; caseId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const membership = await getAgencyMembership(params.id, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "agency_membership_required" }, { status: 403 });
    }

    const kase = await db.participantCase.findFirst({
      where: { id: params.caseId, agencyId: params.id },
      include: { participantProfile: true, benefitProgram: true, consent: true },
    });
    if (!kase) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const hours = await getCaseHoursView(kase.id);

    return NextResponse.json({
      case: {
        id: kase.id,
        participantName: kase.participantProfile.displayName,
        benefitProgramName: kase.benefitProgram.name,
        requiredHoursPerMonth: kase.benefitProgram.requiredHoursPerMonth,
        maskedCaseNumber: formatMaskedCaseNumber(kase.caseNumberLast4),
        status: kase.status,
        openedAt: kase.openedAt,
        hasConsent: Boolean(kase.consent && !kase.consent.revokedAt),
        isAdmin: membership.role === "ADMIN",
        hours,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

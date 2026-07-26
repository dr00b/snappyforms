import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

// Where a participant can "fax" a finished form: their own open cases, and the
// agency fax number on each. Case numbers stay masked — the full value is
// encrypted at rest and is never needed to pick a destination.
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const cases = await db.participantCase.findMany({
      where: { participantProfileId: session.user.participantProfile.id, status: "OPEN" },
      include: { agency: true, benefitProgram: true },
      orderBy: { openedAt: "desc" },
    });

    return NextResponse.json({
      destinations: cases
        .filter((kase) => kase.agency.faxNumber)
        .map((kase) => ({
          participantCaseId: kase.id,
          agencyName: kase.agency.name,
          faxNumber: kase.agency.faxNumber,
          programName: kase.benefitProgram.name,
          caseNumberLast4: kase.caseNumberLast4,
        })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getAgencyMembership } from "@/lib/agency";
import { formatMaskedCaseNumber } from "@/lib/encryption";

export async function GET(
  _request: Request,
  { params }: { params: { id: string; jobId: string } }
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

    const job = await db.bulkQueryJob.findFirst({
      where: { id: params.jobId, agencyId: params.id },
      include: {
        benefitProgram: true,
        results: { include: { participantCase: { include: { participantProfile: true } } } },
      },
    });
    if (!job) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        benefitProgramName: job.benefitProgram.name,
        totalCases: job.totalCases,
        includedCount: job.includedCount,
        excludedCount: job.excludedCount,
        createdAt: job.createdAt,
        results: job.results.map((r) => ({
          participantName: r.participantCase.participantProfile.displayName,
          maskedCaseNumber: formatMaskedCaseNumber(r.participantCase.caseNumberLast4),
          included: r.included,
          excludedReason: r.excludedReason,
          hoursConfirmed: r.hoursConfirmed,
          hoursRequired: r.hoursRequired,
          meetsRequirement: r.meetsRequirement,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

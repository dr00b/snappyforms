import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getAgencyMembership } from "@/lib/agency";
import { getCaseHoursView } from "@/lib/caseHours";
import { runBulkQuerySchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

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

    const [benefitPrograms, jobs] = await Promise.all([
      db.benefitProgram.findMany({ where: { agencyId: params.id }, orderBy: { name: "asc" } }),
      db.bulkQueryJob.findMany({
        where: { agencyId: params.id },
        include: { benefitProgram: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      benefitPrograms,
      jobs: jobs.map((job) => ({
        id: job.id,
        benefitProgramName: job.benefitProgram.name,
        totalCases: job.totalCases,
        includedCount: job.includedCount,
        excludedCount: job.excludedCount,
        createdAt: job.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const membership = await getAgencyMembership(params.id, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "agency_membership_required" }, { status: 403 });
    }

    const { benefitProgramId } = runBulkQuerySchema.parse(await request.json());

    const cases = await db.participantCase.findMany({
      where: { agencyId: params.id, benefitProgramId, status: "OPEN" },
    });

    const results = await Promise.all(
      cases.map(async (kase) => {
        const view = await getCaseHoursView(kase.id);
        if (view.status !== "ok") {
          return {
            participantCaseId: kase.id,
            included: false,
            excludedReason: "NO_CONSENT",
            hoursConfirmed: null,
            hoursRequired: null,
            meetsRequirement: null,
          };
        }
        return {
          participantCaseId: kase.id,
          included: true,
          excludedReason: null,
          hoursConfirmed: view.hoursConfirmed,
          hoursRequired: view.hoursRequired,
          meetsRequirement: view.meetsRequirement,
        };
      })
    );

    const includedCount = results.filter((r) => r.included).length;
    const excludedCount = results.length - includedCount;

    const job = await db.bulkQueryJob.create({
      data: {
        agencyId: params.id,
        benefitProgramId,
        requestedByMembershipId: membership.id,
        totalCases: results.length,
        includedCount,
        excludedCount,
        completedAt: new Date(),
        results: { create: results },
      },
    });

    await logAudit({
      actorUserId: session.userId,
      agencyId: params.id,
      action: "bulk_query_run",
      targetType: "BulkQueryJob",
      targetId: job.id,
    });

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    return handleApiError(error);
  }
}

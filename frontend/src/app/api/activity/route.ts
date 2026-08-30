import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getVerifierEligibleMembership } from "@/lib/activity";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId");
    const status = url.searchParams.get("status");

    let where: Record<string, unknown>;

    if (orgId) {
      const membership = await getVerifierEligibleMembership(orgId, session.userId);
      if (!membership) {
        return NextResponse.json({ error: "not_a_member" }, { status: 403 });
      }
      where = { organizationId: orgId };
    } else if (session.user.participantProfile) {
      where = { participantProfileId: session.user.participantProfile.id };
    } else {
      return NextResponse.json({ error: "orgId_required" }, { status: 400 });
    }

    if (status) {
      where.status = status;
    }

    const records = await db.activityRecord.findMany({
      where,
      include: {
        participantProfile: { include: { handle: true } },
        organization: { include: { handle: true } },
        fraudFlags: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      records: records.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        totalHours: r.totalHours,
        activityDate: r.activityDate,
        participantName: r.participantProfile.displayName,
        participantHandle: r.participantProfile.handle?.displayValue,
        organizationName: r.organization.name,
        organizationHandle: r.organization.handle?.displayValue,
        hasFraudFlags: r.fraudFlags.length > 0,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

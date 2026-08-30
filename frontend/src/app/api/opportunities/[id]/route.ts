import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const opportunity = await db.volunteerOpportunity.findUnique({
      where: { id: params.id },
      include: {
        organization: { include: { handle: true } },
        location: true,
        qrIdentifier: true,
        signups: true,
      },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const session = await getCurrentSession();
    const mySignup =
      session?.user.participantProfile &&
      opportunity.signups.find((s) => s.participantProfileId === session.user.participantProfile!.id);

    return NextResponse.json({
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        date: opportunity.date,
        startTime: opportunity.startTime,
        endTime: opportunity.endTime,
        openings: opportunity.openings,
        taskCategory: opportunity.taskCategory,
        contactPerson: opportunity.contactPerson,
        minimumAge: opportunity.minimumAge,
        accessibilityInfo: opportunity.accessibilityInfo,
        transportationInfo: opportunity.transportationInfo,
        backgroundCheckRequired: opportunity.backgroundCheckRequired,
        trainingRequired: opportunity.trainingRequired,
        remoteOrInPerson: opportunity.remoteOrInPerson,
        organizationId: opportunity.organizationId,
        organizationName: opportunity.organization.name,
        organizationHandle: opportunity.organization.handle?.displayValue ?? null,
        locationName: opportunity.location?.name ?? null,
        qrId: opportunity.qrIdentifier?.id ?? null,
        signedUpCount: opportunity.signups.filter((s) => s.status !== "CANCELLED").length,
      },
      mySignup: mySignup ? { status: mySignup.status, checkedInAt: mySignup.checkedInAt } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

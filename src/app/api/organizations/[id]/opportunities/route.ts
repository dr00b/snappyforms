import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOpportunitySchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getOrgAdminMembership } from "@/lib/activity";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const opportunities = await db.volunteerOpportunity.findMany({
      where: { organizationId: params.id },
      include: { location: true },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ opportunities });
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
    const admin = await getOrgAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const body = createOpportunitySchema.parse(await request.json());

    if (body.locationId) {
      const location = await db.organizationLocation.findFirst({
        where: { id: body.locationId, organizationId: params.id },
      });
      if (!location) {
        return NextResponse.json({ error: "location_not_found" }, { status: 404 });
      }
    }

    const opportunity = await db.volunteerOpportunity.create({
      data: {
        organizationId: params.id,
        locationId: body.locationId,
        createdByUserId: session.userId,
        title: body.title,
        description: body.description,
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        openings: body.openings,
        taskCategory: body.taskCategory,
        contactPerson: body.contactPerson,
        minimumAge: body.minimumAge,
        accessibilityInfo: body.accessibilityInfo,
        transportationInfo: body.transportationInfo,
        backgroundCheckRequired: body.backgroundCheckRequired,
        trainingRequired: body.trainingRequired,
        remoteOrInPerson: body.remoteOrInPerson,
        qrIdentifier: { create: { ownerType: "OPPORTUNITY" } },
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: "opportunity_created",
      targetType: "VolunteerOpportunity",
      targetId: opportunity.id,
    });

    return NextResponse.json({ ok: true, opportunity });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";

export async function GET(_request: Request, { params }: { params: { opaqueId: string } }) {
  const identifier = await db.qRIdentifier.findUnique({
    where: { id: params.opaqueId },
    include: {
      participantProfile: { include: { handle: true } },
      organization: { include: { handle: true } },
      location: { include: { organization: { include: { handle: true } } } },
      opportunity: { include: { organization: { include: { handle: true } } } },
    },
  });

  if (!identifier || identifier.revokedAt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await getCurrentSession();

  if (identifier.ownerType === "PARTICIPANT" && identifier.participantProfile?.handle) {
    await logAudit({
      actorUserId: session?.userId,
      action: "qr_scan",
      targetType: "ParticipantProfile",
      targetId: identifier.participantProfile.id,
    });
    return NextResponse.json({
      type: "participant",
      handle: identifier.participantProfile.handle.displayValue,
      displayName: identifier.participantProfile.displayName,
    });
  }

  if (identifier.ownerType === "ORGANIZATION" && identifier.organization?.handle) {
    await logAudit({
      actorUserId: session?.userId,
      action: "qr_scan",
      targetType: "Organization",
      targetId: identifier.organization.id,
    });
    return NextResponse.json({
      type: "organization",
      handle: identifier.organization.handle.displayValue,
      displayName: identifier.organization.name,
    });
  }

  if (identifier.ownerType === "LOCATION" && identifier.location?.organization.handle) {
    await logAudit({
      actorUserId: session?.userId,
      action: "qr_scan",
      targetType: "OrganizationLocation",
      targetId: identifier.location.id,
    });
    return NextResponse.json({
      type: "location",
      handle: identifier.location.organization.handle.displayValue,
      displayName: identifier.location.name,
    });
  }

  if (identifier.ownerType === "OPPORTUNITY" && identifier.opportunity) {
    await logAudit({
      actorUserId: session?.userId,
      action: "qr_scan",
      targetType: "VolunteerOpportunity",
      targetId: identifier.opportunity.id,
    });
    return NextResponse.json({
      type: "opportunity",
      id: identifier.opportunity.id,
      displayName: identifier.opportunity.title,
    });
  }

  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

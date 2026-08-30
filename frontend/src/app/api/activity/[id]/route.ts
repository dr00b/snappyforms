import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getVerifierEligibleMembership, verifierActions, participantActions, STATUS_LABELS } from "@/lib/activity";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const record = await db.activityRecord.findUnique({
      where: { id: params.id },
      include: {
        participantProfile: { include: { handle: true } },
        organization: { include: { handle: true } },
        verifierMembership: true,
        confirmations: { include: { confirmedByUser: true }, orderBy: { createdAt: "asc" } },
        disputes: { include: { raisedByUser: true }, orderBy: { createdAt: "asc" } },
        fraudFlags: true,
        supersedes: true,
        supersededBy: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const isOwningParticipant = session.user.participantProfile?.id === record.participantProfileId;
    const membership = await getVerifierEligibleMembership(record.organizationId, session.userId);
    const isOrgMember = Boolean(membership);

    if (!isOwningParticipant && !isOrgMember) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const availableActions = isOrgMember
      ? verifierActions(record.status)
      : isOwningParticipant
      ? participantActions(record.status)
      : [];

    return NextResponse.json({
      record: {
        ...record,
        statusLabel: STATUS_LABELS[record.status] ?? record.status,
      },
      viewer: {
        role: isOrgMember ? membership!.role : "PARTICIPANT",
        isOwningParticipant,
        isOrgMember,
        isOrgAdmin: membership?.role === "ADMIN",
        availableActions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

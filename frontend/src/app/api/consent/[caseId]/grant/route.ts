import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: { caseId: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const kase = await db.participantCase.findFirst({
      where: { id: params.caseId, participantProfileId: session.user.participantProfile.id },
    });
    if (!kase) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await db.consent.upsert({
      where: { participantCaseId: kase.id },
      create: {
        participantCaseId: kase.id,
        grantedByUserId: session.userId,
      },
      update: {
        revokedAt: null,
        grantedByUserId: session.userId,
        grantedAt: new Date(),
      },
    });

    await logAudit({
      actorUserId: session.userId,
      agencyId: kase.agencyId,
      action: "consent_granted",
      targetType: "ParticipantCase",
      targetId: kase.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

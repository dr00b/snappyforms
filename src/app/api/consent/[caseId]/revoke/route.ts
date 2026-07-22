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
      include: { consent: true },
    });
    if (!kase || !kase.consent) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await db.consent.update({
      where: { participantCaseId: kase.id },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      actorUserId: session.userId,
      agencyId: kase.agencyId,
      action: "consent_revoked",
      targetType: "ParticipantCase",
      targetId: kase.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { getAgencyAdminMembership } from "@/lib/agency";
import { decryptCaseNumber } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export async function POST(
  _request: Request,
  { params }: { params: { id: string; caseId: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const admin = await getAgencyAdminMembership(params.id, session.userId);
    if (!admin) {
      return NextResponse.json({ error: "admin_required" }, { status: 403 });
    }

    const limit = checkRateLimit(`reveal-case:${session.userId}`, 60 * 1000, 10);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfterMs: limit.retryAfterMs },
        { status: 429 }
      );
    }

    const kase = await db.participantCase.findFirst({
      where: { id: params.caseId, agencyId: params.id },
    });
    if (!kase) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const caseNumber = decryptCaseNumber(kase.caseNumberEncrypted);

    await logAudit({
      actorUserId: session.userId,
      agencyId: params.id,
      action: "case_number_revealed",
      targetType: "ParticipantCase",
      targetId: kase.id,
    });

    return NextResponse.json({ caseNumber });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestChangesSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership } from "@/lib/activity";
import { certifierActions } from "@/lib/formCertification";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const { message } = requestChangesSchema.parse(await request.json());

    const certRequest = await db.formCertificationRequest.findUnique({ where: { id: params.id } });
    if (!certRequest) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!certifierActions(certRequest.status).includes("request-changes")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getVerifierEligibleMembership(certRequest.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    await db.formCertificationRequest.update({
      where: { id: certRequest.id },
      data: { status: "CHANGES_REQUESTED", changeRequestMessage: message },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: certRequest.organizationId,
      action: "form_certification_changes_requested",
      targetType: "FormCertificationRequest",
      targetId: certRequest.id,
      priorStatus: "AWAITING_ORGANIZATION",
      newStatus: "CHANGES_REQUESTED",
    });

    const participant = await db.participantProfile.findUnique({ where: { id: certRequest.participantProfileId } });
    if (participant) {
      await notifyUser(participant.userId, {
        type: "CHANGES_REQUESTED",
        title: "Changes requested on your PA 1938 form",
        body: `The organization asked for changes: ${message}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

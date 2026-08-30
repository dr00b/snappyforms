import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { declineFormSchema } from "@/lib/validation";
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
    const { message } = declineFormSchema.parse(await request.json().catch(() => ({})));

    const certRequest = await db.formCertificationRequest.findUnique({ where: { id: params.id } });
    if (!certRequest) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!certifierActions(certRequest.status).includes("decline")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getVerifierEligibleMembership(certRequest.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    await db.formCertificationRequest.update({
      where: { id: certRequest.id },
      data: { status: "DECLINED", changeRequestMessage: message },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: certRequest.organizationId,
      action: "form_certification_declined",
      targetType: "FormCertificationRequest",
      targetId: certRequest.id,
      priorStatus: "AWAITING_ORGANIZATION",
      newStatus: "DECLINED",
    });

    const participant = await db.participantProfile.findUnique({ where: { id: certRequest.participantProfileId } });
    if (participant) {
      await notifyUser(participant.userId, {
        type: "VERIFICATION_DECLINED",
        title: "PA 1938 certification declined",
        body: message
          ? `Your PA 1938 certification request was declined: ${message}`
          : "Your PA 1938 certification request was declined.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

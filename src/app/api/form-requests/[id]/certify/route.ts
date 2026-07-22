import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { certifyFormSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership, recordFirstApprovalIfNeeded } from "@/lib/activity";
import { certifierActions } from "@/lib/formCertification";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const body = certifyFormSchema.parse(await request.json());

    const certRequest = await db.formCertificationRequest.findUnique({ where: { id: params.id } });
    if (!certRequest) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!certifierActions(certRequest.status).includes("certify")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    const membership = await getVerifierEligibleMembership(certRequest.organizationId, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_authorized" }, { status: 403 });
    }

    await db.formCertificationRequest.update({
      where: { id: certRequest.id },
      data: {
        status: "CERTIFIED",
        siteManagerName: body.siteManagerName,
        siteManagerTitle: body.siteManagerTitle,
        confirmationDate: body.confirmationDate,
        signature: body.signature,
        certifiedByUserId: session.userId,
        certifiedAt: new Date(),
      },
    });
    await recordFirstApprovalIfNeeded(membership, "FORM_CERTIFICATION_REQUEST", certRequest.id);

    await logAudit({
      actorUserId: session.userId,
      organizationId: certRequest.organizationId,
      action: "form_certified",
      targetType: "FormCertificationRequest",
      targetId: certRequest.id,
      priorStatus: "AWAITING_ORGANIZATION",
      newStatus: "CERTIFIED",
    });

    const participant = await db.participantProfile.findUnique({ where: { id: certRequest.participantProfileId } });
    if (participant) {
      await notifyUser(participant.userId, {
        type: "VERIFICATION_CONFIRMED",
        title: "PA 1938 form certified",
        body: `${body.siteManagerName} certified your PA 1938 demonstration form. Finalize it to download the PDF.`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

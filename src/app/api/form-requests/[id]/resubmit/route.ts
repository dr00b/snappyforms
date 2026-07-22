import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resubmitFormCertificationSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { requesterActions } from "@/lib/formCertification";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const body = resubmitFormCertificationSchema.parse(await request.json());

    const certRequest = await db.formCertificationRequest.findUnique({ where: { id: params.id } });
    if (!certRequest) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (certRequest.requestedByUserId !== session.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!requesterActions(certRequest.status).includes("resubmit")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }

    await db.formCertificationRequest.update({
      where: { id: certRequest.id },
      data: {
        status: "AWAITING_ORGANIZATION",
        participantFullName: body.participant.fullName,
        participantDob: body.participant.dob,
        participantAddress: body.participant.address,
        participantCity: body.participant.city,
        participantState: body.participant.state,
        participantZip: body.participant.zip,
        agencyName: body.agency.name,
        agencyPhone: body.agency.phone,
        agencyAddress: body.agency.address,
        agencyCity: body.agency.city,
        agencyState: body.agency.state,
        agencyZip: body.agency.zip,
        serviceStartDate: body.service.startDate,
        serviceEndDate: body.service.endDate,
        transportationProvided: body.service.transportationProvided,
        week1Hours: body.service.week1Hours,
        week2Hours: body.service.week2Hours,
        week3Hours: body.service.week3Hours,
        week4Hours: body.service.week4Hours,
        tasks: JSON.stringify(body.service.tasks.filter(Boolean).slice(0, 3)),
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: certRequest.organizationId,
      action: "form_certification_resubmitted",
      targetType: "FormCertificationRequest",
      targetId: certRequest.id,
      priorStatus: "CHANGES_REQUESTED",
      newStatus: "AWAITING_ORGANIZATION",
    });

    const notifyTargets = certRequest.verifierMembershipId
      ? [await db.organizationMembership.findUnique({ where: { id: certRequest.verifierMembershipId } })]
      : await db.organizationMembership.findMany({
          where: { organizationId: certRequest.organizationId, role: "ADMIN", status: "ACTIVE" },
        });

    for (const membership of notifyTargets) {
      if (!membership) continue;
      await notifyUser(membership.userId, {
        type: "VERIFICATION_REQUESTED",
        title: "Updated PA 1938 certification request",
        body: "The PA 1938 request was updated and resubmitted for certification.",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

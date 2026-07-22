import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { finalizeFormSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { requesterActions } from "@/lib/formCertification";
import { renderPa1938Form } from "@/lib/pdf/pa1938";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const { ssnLast4 } = finalizeFormSchema.parse(await request.json().catch(() => ({})));

    const certRequest = await db.formCertificationRequest.findUnique({ where: { id: params.id } });
    if (!certRequest) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (certRequest.requestedByUserId !== session.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (!requesterActions(certRequest.status).includes("finalize")) {
      return NextResponse.json({ error: "invalid_status" }, { status: 409 });
    }
    if (
      !certRequest.siteManagerName ||
      !certRequest.siteManagerTitle ||
      !certRequest.confirmationDate ||
      !certRequest.signature
    ) {
      return NextResponse.json({ error: "not_certified" }, { status: 409 });
    }

    // ssnLast4 flows straight into the PDF bytes below and is never written to any
    // database column, same guarantee as the original one-shot wizard had.
    const pdfBytes = await renderPa1938Form(
      {
        participant: {
          fullName: certRequest.participantFullName,
          dob: certRequest.participantDob,
          address: certRequest.participantAddress,
          city: certRequest.participantCity,
          state: certRequest.participantState,
          zip: certRequest.participantZip,
        },
        agency: {
          name: certRequest.agencyName,
          phone: certRequest.agencyPhone,
          address: certRequest.agencyAddress,
          city: certRequest.agencyCity,
          state: certRequest.agencyState,
          zip: certRequest.agencyZip,
        },
        service: {
          startDate: certRequest.serviceStartDate,
          endDate: certRequest.serviceEndDate,
          transportationProvided: certRequest.transportationProvided,
          week1Hours: certRequest.week1Hours,
          week2Hours: certRequest.week2Hours,
          week3Hours: certRequest.week3Hours,
          week4Hours: certRequest.week4Hours,
          tasks: JSON.parse(certRequest.tasks) as string[],
        },
        certification: {
          siteManagerName: certRequest.siteManagerName,
          siteManagerTitle: certRequest.siteManagerTitle,
          confirmationDate: certRequest.confirmationDate,
          signature: certRequest.signature,
        },
      },
      ssnLast4 || undefined
    );

    const totalMonthlyHours =
      certRequest.week1Hours + certRequest.week2Hours + certRequest.week3Hours + certRequest.week4Hours;

    const generatedForm = await db.generatedForm.create({
      data: {
        templateKey: "PA_1938",
        participantProfileId: certRequest.participantProfileId,
        organizationId: certRequest.organizationId,
        generatedByUserId: session.userId,
        sourceRecordIds: JSON.stringify(certRequest.sourceRecordId ? [certRequest.sourceRecordId] : []),
        fieldsSnapshot: JSON.stringify({
          templateKey: "PA_1938",
          organizationName: certRequest.agencyName,
          serviceStartDate: certRequest.serviceStartDate,
          serviceEndDate: certRequest.serviceEndDate,
          totalMonthlyHours,
          certifiedBy: certRequest.siteManagerName,
        }),
        pdfBytes: Buffer.from(pdfBytes),
      },
    });

    await db.formCertificationRequest.update({
      where: { id: certRequest.id },
      data: { status: "FINALIZED", generatedFormId: generatedForm.id },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: certRequest.organizationId,
      action: "form_finalized",
      targetType: "GeneratedForm",
      targetId: generatedForm.id,
      priorStatus: "CERTIFIED",
      newStatus: "FINALIZED",
    });

    return NextResponse.json({ ok: true, generatedFormId: generatedForm.id });
  } catch (error) {
    return handleApiError(error);
  }
}

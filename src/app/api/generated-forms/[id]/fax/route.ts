import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { sendFaxSchema } from "@/lib/validation";
import { generateConfirmationNumber, renderFaxBundle } from "@/lib/fax";
import { getFormTemplate } from "@/lib/formTemplates";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const { participantCaseId } = sendFaxSchema.parse(await request.json());

    const form = await db.generatedForm.findUnique({ where: { id: params.id } });
    if (!form || form.participantProfileId !== session.user.participantProfile.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const participantCase = await db.participantCase.findUnique({
      where: { id: participantCaseId },
      include: { agency: true, benefitProgram: true },
    });
    if (!participantCase || participantCase.participantProfileId !== session.user.participantProfile.id) {
      return NextResponse.json({ error: "case_not_found" }, { status: 404 });
    }
    if (participantCase.status !== "OPEN") {
      return NextResponse.json({ error: "case_not_open" }, { status: 400 });
    }
    if (!participantCase.agency.faxNumber) {
      return NextResponse.json({ error: "agency_has_no_fax_number" }, { status: 400 });
    }

    const confirmationNumber = generateConfirmationNumber();
    const { pdfBytes, pageCount } = await renderFaxBundle(new Uint8Array(form.pdfBytes), {
      senderName: session.user.participantProfile.displayName,
      destinationName: participantCase.agency.name,
      destinationFax: participantCase.agency.faxNumber,
      caseNumberLast4: participantCase.caseNumberLast4,
      programName: participantCase.benefitProgram.name,
      formName: getFormTemplate(form.templateKey)?.name ?? form.templateKey.replaceAll("_", " "),
      confirmationNumber,
      sentAt: new Date(),
    });

    const transmission = await db.faxTransmission.create({
      data: {
        generatedFormId: form.id,
        sentByUserId: session.userId,
        participantCaseId: participantCase.id,
        destinationName: participantCase.agency.name,
        destinationFax: participantCase.agency.faxNumber,
        caseNumberLast4: participantCase.caseNumberLast4,
        pageCount,
        confirmationNumber,
        pdfBytes: Buffer.from(pdfBytes),
      },
    });

    await logAudit({
      actorUserId: session.userId,
      agencyId: participantCase.agencyId,
      action: "form_faxed",
      targetType: "FaxTransmission",
      targetId: transmission.id,
    });

    return NextResponse.json({
      ok: true,
      id: transmission.id,
      confirmationNumber,
      pageCount,
      destinationName: transmission.destinationName,
      destinationFax: transmission.destinationFax,
      caseNumberLast4: transmission.caseNumberLast4,
      senderName: session.user.participantProfile.displayName,
      sentAt: transmission.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

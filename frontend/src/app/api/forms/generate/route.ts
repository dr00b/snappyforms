import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateFormSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getFormTemplate } from "@/lib/formTemplates";
import { renderGenericForm } from "@/lib/pdf/genericForm";
import {
  PA1895_MAX_ROWS,
  renderPa1895Form,
  sameFormWeek,
  weekEndingSaturday,
} from "@/lib/pdf/pa1895";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const { templateKey, activityRecordIds } = generateFormSchema.parse(await request.json());
    const template = getFormTemplate(templateKey);
    if (!template) {
      return NextResponse.json({ error: "unknown_template" }, { status: 400 });
    }

    const records = await db.activityRecord.findMany({
      where: {
        id: { in: activityRecordIds },
        participantProfileId: session.user.participantProfile.id,
        status: "CONFIRMED",
      },
      include: {
        confirmations: { orderBy: { createdAt: "desc" }, take: 1 },
        verifierMembership: true,
        organization: true,
      },
    });

    if (records.length !== activityRecordIds.length) {
      return NextResponse.json({ error: "records_not_eligible" }, { status: 400 });
    }

    // PA 1895 carries a contact person and an authorized signature on every row,
    // so a week spent at two organizations is an ordinary week for that form.
    // The summary forms speak for one organization as a whole, so they still
    // require one.
    const organizationIds = new Set(records.map((r) => r.organizationId));
    if (templateKey !== "PA_1895" && organizationIds.size !== 1) {
      return NextResponse.json({ error: "records_must_share_organization" }, { status: 400 });
    }
    if (records.some((r) => !template.sourceCategories.includes(r.category))) {
      return NextResponse.json({ error: "category_mismatch" }, { status: 400 });
    }

    // The generated form is filed under one organization even when its rows span
    // several; the earliest row's organization is the one that owns the record.
    let organization = records[0].organization;

    let pdfBytes: Uint8Array;
    if (templateKey === "PA_1895") {
      const dated = [...records].sort(
        (a, b) => (a.activityDate?.getTime() ?? 0) - (b.activityDate?.getTime() ?? 0)
      );
      if (dated.some((r) => !r.activityDate)) {
        return NextResponse.json({ error: "records_need_activity_date" }, { status: 400 });
      }
      if (dated.length > PA1895_MAX_ROWS) {
        return NextResponse.json({ error: "too_many_records_for_one_week" }, { status: 400 });
      }
      const dates = dated.map((r) => r.activityDate as Date);
      if (!sameFormWeek(dates)) {
        return NextResponse.json({ error: "records_must_share_one_week" }, { status: 400 });
      }

      organization = dated[0].organization;
      const organizationNames = [...new Set(dated.map((r) => r.organization.name))];

      pdfBytes = await renderPa1895Form({
        clientName: session.user.participantProfile.displayName,
        weekEnding: weekEndingSaturday(dates[0]),
        rows: dated.map((r) => ({
          date: r.activityDate as Date,
          typeOfActivity: r.title,
          contactPersonAndPhone: r.supervisorName ?? r.organization.name,
          authorizedSignature: r.verifierMembership?.displayName ?? r.organization.name,
          beginTime: r.startTime ?? "",
          endTime: r.endTime ?? "",
          totalDailyHours: r.totalHours ?? 0,
        })),
        comments:
          `Verified through SnappyForms: each activity below was confirmed at the shift by ` +
          `${organizationNames.join(", ")}, via a rotating code the participant scanned in ` +
          `person. Record IDs: ${dated.map((r) => r.id).join(", ")}.`,
      });
    } else {
      pdfBytes = await renderGenericForm({
        templateKey,
        participantName: session.user.participantProfile.displayName,
        participantHandle: session.user.participantProfile.handle?.displayValue ?? "",
        organizationName: organization.name,
        records: records.map((r) => ({
          title: r.title,
          category: r.category,
          activityDate: r.activityDate,
          totalHours: r.totalHours,
          confirmedAt: r.confirmations[0]?.createdAt ?? null,
        })),
      });
    }

    const totalHours = records.reduce((sum, r) => sum + (r.totalHours ?? 0), 0);

    const form = await db.generatedForm.create({
      data: {
        templateKey,
        participantProfileId: session.user.participantProfile.id,
        organizationId: organization.id,
        generatedByUserId: session.userId,
        sourceRecordIds: JSON.stringify(activityRecordIds),
        fieldsSnapshot: JSON.stringify({
          templateKey,
          organizationName: organization.name,
          recordCount: records.length,
          totalHours,
        }),
        pdfBytes: Buffer.from(pdfBytes),
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: organization.id,
      action: "form_generated",
      targetType: "GeneratedForm",
      targetId: form.id,
    });

    return NextResponse.json({ ok: true, id: form.id });
  } catch (error) {
    return handleApiError(error);
  }
}

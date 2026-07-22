import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateFormSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getFormTemplate } from "@/lib/formTemplates";
import { renderGenericForm } from "@/lib/pdf/genericForm";

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
      include: { confirmations: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (records.length !== activityRecordIds.length) {
      return NextResponse.json({ error: "records_not_eligible" }, { status: 400 });
    }

    const organizationIds = new Set(records.map((r) => r.organizationId));
    if (organizationIds.size !== 1) {
      return NextResponse.json({ error: "records_must_share_organization" }, { status: 400 });
    }
    if (records.some((r) => !template.sourceCategories.includes(r.category))) {
      return NextResponse.json({ error: "category_mismatch" }, { status: 400 });
    }

    const organization = await db.organization.findUnique({ where: { id: [...organizationIds][0] } });
    if (!organization) {
      return NextResponse.json({ error: "organization_not_found" }, { status: 404 });
    }

    const pdfBytes = await renderGenericForm({
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

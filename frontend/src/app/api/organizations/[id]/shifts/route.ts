import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hostShiftSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { getVerifierEligibleMembership } from "@/lib/activity";
import { generateShiftSecret } from "@/lib/shiftTotp";
import { shiftHours } from "@/lib/shifts";

/**
 * Hosting a shift means minting a rotating QR that will sign records on your
 * behalf, so the gate is the same one used to confirm a record
 * (verifier-eligible), not the admin gate used for the public opportunity
 * board. Anyone the org trusts to sign a volunteer's sheet can run a shift.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const membership = await getVerifierEligibleMembership(params.id, session.userId);
    if (!membership) {
      return NextResponse.json({ error: "not_a_member" }, { status: 403 });
    }

    const body = hostShiftSchema.parse(await request.json());

    const hours = shiftHours(body.startTime, body.endTime);
    if (hours === null) {
      return NextResponse.json({ error: "end_time_must_follow_start_time" }, { status: 400 });
    }

    const opportunity = await db.volunteerOpportunity.create({
      data: {
        organizationId: params.id,
        createdByUserId: session.userId,
        title: body.title,
        description: body.description,
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        taskCategory: body.taskCategory,
        contactPerson: body.contactPhone
          ? `${body.contactPerson} ${body.contactPhone}`
          : body.contactPerson,
        remoteOrInPerson: body.remoteOrInPerson,
        totpSecret: generateShiftSecret(),
        qrIdentifier: { create: { ownerType: "OPPORTUNITY" } },
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: params.id,
      action: "shift_hosted",
      targetType: "VolunteerOpportunity",
      targetId: opportunity.id,
    });

    // Serialized explicitly: spreading the model would leak totpSecret.
    return NextResponse.json({
      ok: true,
      shift: {
        id: opportunity.id,
        organizationId: opportunity.organizationId,
        title: opportunity.title,
        date: opportunity.date,
        startTime: opportunity.startTime,
        endTime: opportunity.endTime,
        taskCategory: opportunity.taskCategory,
        contactPerson: opportunity.contactPerson,
        totalHours: hours,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createFormCertificationRequestSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership } from "@/lib/activity";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId");

    let where: Record<string, unknown>;

    if (orgId) {
      const membership = await getVerifierEligibleMembership(orgId, session.userId);
      if (!membership) {
        return NextResponse.json({ error: "not_a_member" }, { status: 403 });
      }
      where = { organizationId: orgId };
    } else if (session.user.participantProfile) {
      where = { participantProfileId: session.user.participantProfile.id };
    } else {
      return NextResponse.json({ error: "orgId_required" }, { status: 400 });
    }

    const requests = await db.formCertificationRequest.findMany({
      where,
      include: {
        participantProfile: { include: { handle: true } },
        organization: { include: { handle: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        templateKey: r.templateKey,
        status: r.status,
        participantName: r.participantProfile.displayName,
        organizationName: r.organization.name,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }

    const body = createFormCertificationRequestSchema.parse(await request.json());

    const organization = await db.organization.findUnique({ where: { id: body.organizationId } });
    if (!organization) {
      return NextResponse.json({ error: "organization_not_found" }, { status: 404 });
    }

    let verifierMembership = null;
    if (body.verifierMembershipId) {
      verifierMembership = await db.organizationMembership.findFirst({
        where: {
          id: body.verifierMembershipId,
          organizationId: body.organizationId,
          status: { in: ["ACTIVE", "PENDING"] },
        },
      });
      if (!verifierMembership) {
        return NextResponse.json({ error: "verifier_unavailable" }, { status: 400 });
      }
    }

    if (body.sourceRecordId) {
      const record = await db.activityRecord.findFirst({
        where: {
          id: body.sourceRecordId,
          participantProfileId: session.user.participantProfile.id,
          organizationId: body.organizationId,
          status: "CONFIRMED",
        },
      });
      if (!record) {
        return NextResponse.json({ error: "source_record_not_eligible" }, { status: 400 });
      }
    }

    const certRequest = await db.formCertificationRequest.create({
      data: {
        templateKey: "PA_1938",
        participantProfileId: session.user.participantProfile.id,
        organizationId: body.organizationId,
        requestedByUserId: session.userId,
        verifierMembershipId: verifierMembership?.id,
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
        sourceRecordId: body.sourceRecordId,
      },
    });

    await logAudit({
      actorUserId: session.userId,
      organizationId: organization.id,
      action: "form_certification_requested",
      targetType: "FormCertificationRequest",
      targetId: certRequest.id,
      newStatus: certRequest.status,
    });

    const notifyTargets = verifierMembership
      ? [verifierMembership]
      : await db.organizationMembership.findMany({
          where: { organizationId: organization.id, role: "ADMIN", status: "ACTIVE" },
        });

    for (const membership of notifyTargets) {
      await notifyUser(membership.userId, {
        type: "VERIFICATION_REQUESTED",
        title: "PA 1938 certification requested",
        body: `${session.user.participantProfile.displayName} needs a site manager to certify a PA 1938 demonstration form.`,
      });
    }

    return NextResponse.json({ ok: true, id: certRequest.id });
  } catch (error) {
    return handleApiError(error);
  }
}

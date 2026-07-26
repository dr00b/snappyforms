import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { shiftScanConfirmSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { getVerifierEligibleMembership, recordFirstApprovalIfNeeded, computeFraudFlags } from "@/lib/activity";
import { checkinCodeHash, verifyCode } from "@/lib/shiftTotp";
import { shiftCategory, shiftHours } from "@/lib/shifts";

const CONFIRMATION_MESSAGE =
  "Confirmed at the shift: the volunteer scanned the host's rotating QR code, " +
  "which is only valid for the window it was displayed in.";

/**
 * The signature step. A volunteer presenting a live code from this shift's QR
 * proves they were standing with the host, so the record is written already
 * CONFIRMED with the host's membership as verifier — the same end state a
 * manual approval would reach, minus the round trip.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!session.user.participantProfile) {
      return NextResponse.json({ error: "participant_profile_required" }, { status: 403 });
    }
    const participantProfileId = session.user.participantProfile.id;

    const { code } = shiftScanConfirmSchema.parse(await request.json());

    const opportunity = await db.volunteerOpportunity.findUnique({
      where: { id: params.id },
      include: { organization: true },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "shift_not_found" }, { status: 404 });
    }
    if (!opportunity.totpSecret) {
      return NextResponse.json({ error: "shift_not_hosted" }, { status: 409 });
    }

    const verified = verifyCode(opportunity.totpSecret, code);
    if (!verified.ok) {
      return NextResponse.json({ error: "invalid_code" }, { status: 401 });
    }

    // The host who created the shift is the authorized signer. If they have
    // since left the org, nobody's signature stands behind this QR.
    const verifierMembership = await getVerifierEligibleMembership(
      opportunity.organizationId,
      opportunity.createdByUserId
    );
    if (!verifierMembership) {
      return NextResponse.json({ error: "shift_host_not_authorized" }, { status: 409 });
    }

    const existing = await db.opportunitySignup.findUnique({
      where: {
        opportunityId_participantProfileId: {
          opportunityId: opportunity.id,
          participantProfileId,
        },
      },
    });
    if (existing?.activityRecordId) {
      return NextResponse.json(
        { error: "already_checked_in", activityRecordId: existing.activityRecordId },
        { status: 409 }
      );
    }

    const totalHours = shiftHours(opportunity.startTime, opportunity.endTime);
    const checkedInAt = new Date();

    let record;
    try {
      record = await db.$transaction(async (tx) => {
        const created = await tx.activityRecord.create({
          data: {
            participantProfileId,
            organizationId: opportunity.organizationId,
            verifierMembershipId: verifierMembership.id,
            initiatedBy: "PARTICIPANT",
            category: shiftCategory(opportunity),
            title: opportunity.title,
            description: opportunity.description,
            // Hours come from the shift the host published, not from the
            // moment of the scan — volunteers scan as they leave, so a
            // scan-derived duration would be zero.
            activityDate: opportunity.date,
            startTime: opportunity.startTime,
            endTime: opportunity.endTime,
            totalHours,
            paidStatus: "UNPAID",
            locationType: opportunity.remoteOrInPerson,
            supervisorName: opportunity.contactPerson,
            status: "CONFIRMED",
          },
        });

        await tx.recordConfirmation.create({
          data: {
            activityRecordId: created.id,
            confirmedByUserId: opportunity.createdByUserId,
            action: "CONFIRMED",
            message: CONFIRMATION_MESSAGE,
          },
        });

        const checkin = {
          status: "CHECKED_IN",
          checkedInAt,
          activityRecordId: created.id,
          codeHash: checkinCodeHash(opportunity.id, verified.matchedStep, code),
          matchedStep: verified.matchedStep,
        };
        await tx.opportunitySignup.upsert({
          where: {
            opportunityId_participantProfileId: {
              opportunityId: opportunity.id,
              participantProfileId,
            },
          },
          // Only claim a signup that has not already produced a record; the
          // unique constraint on activityRecordId is the real backstop against
          // two concurrent scans by the same volunteer.
          update: checkin,
          create: {
            opportunityId: opportunity.id,
            participantProfileId,
            ...checkin,
          },
        });

        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "already_checked_in" }, { status: 409 });
      }
      throw error;
    }

    const flags = await computeFraudFlags(record);
    if (flags.length > 0) {
      await db.fraudReviewFlag.createMany({
        data: flags.map((f) => ({ activityRecordId: record.id, type: f.type, message: f.message })),
      });
    }
    await recordFirstApprovalIfNeeded(verifierMembership, "ACTIVITY_RECORD", record.id);

    await logAudit({
      actorUserId: session.userId,
      organizationId: opportunity.organizationId,
      action: "shift_scan_confirmed",
      targetType: "ActivityRecord",
      targetId: record.id,
      newStatus: record.status,
    });

    await notifyUser(session.userId, {
      type: "VERIFICATION_CONFIRMED",
      title: "Shift confirmed",
      body: `${opportunity.organization.name} confirmed "${record.title}" when you scanned the shift code.`,
      activityRecordId: record.id,
    });

    return NextResponse.json({
      ok: true,
      record: {
        id: record.id,
        title: record.title,
        status: record.status,
        totalHours: record.totalHours,
        activityDate: record.activityDate,
        organizationName: opportunity.organization.name,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

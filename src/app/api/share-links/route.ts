import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createShareLinkSchema } from "@/lib/validation";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const links = await db.shareLink.findMany({
      where: { ownerUserId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      links: links.map((l) => ({
        id: l.id,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        label: l.label,
        expiresAt: l.expiresAt,
        revokedAt: l.revokedAt,
        accessCount: l.accessCount,
        createdAt: l.createdAt,
        isActive: !l.revokedAt && l.expiresAt > new Date(),
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

    const body = createShareLinkSchema.parse(await request.json());

    if (body.resourceType === "ACTIVITY_RECORD") {
      const record = await db.activityRecord.findFirst({
        where: {
          id: body.resourceId,
          participantProfileId: session.user.participantProfile.id,
          status: "CONFIRMED",
        },
      });
      if (!record) {
        return NextResponse.json({ error: "record_not_eligible" }, { status: 400 });
      }
    } else {
      const form = await db.generatedForm.findFirst({
        where: { id: body.resourceId, participantProfileId: session.user.participantProfile.id },
      });
      if (!form) {
        return NextResponse.json({ error: "form_not_found" }, { status: 404 });
      }
    }

    const link = await db.shareLink.create({
      data: {
        ownerUserId: session.userId,
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        label: body.label,
        expiresAt: new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000),
      },
    });

    await logAudit({
      actorUserId: session.userId,
      action: "share_link_created",
      targetType: body.resourceType,
      targetId: body.resourceId,
      correlationId: link.id,
    });

    const base = process.env.APP_BASE_URL ?? "http://localhost:3000";

    return NextResponse.json({ ok: true, id: link.id, url: `${base}/share/${link.id}`, expiresAt: link.expiresAt });
  } catch (error) {
    return handleApiError(error);
  }
}

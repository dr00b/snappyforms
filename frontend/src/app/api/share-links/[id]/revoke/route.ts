import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const link = await db.shareLink.findUnique({ where: { id: params.id } });
    if (!link || link.ownerUserId !== session.userId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await db.shareLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });

    await logAudit({
      actorUserId: session.userId,
      action: "share_link_revoked",
      targetType: link.resourceType,
      targetId: link.resourceId,
      correlationId: link.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const current = await getCurrentSession();
    if (!current) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const sessions = await db.session.findMany({
      where: { userId: current.userId, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        device: s.userAgent ?? "Unknown device",
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        expiresAt: s.expiresAt,
        isCurrent: s.id === current.id,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

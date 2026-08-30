import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    const count = await db.notification.count({
      where: { userId: session.userId, readAt: null },
    });

    return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error);
  }
}

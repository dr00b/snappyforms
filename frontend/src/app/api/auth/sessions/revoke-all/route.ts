import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession, revokeAllSessions, clearSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({ includeCurrent: z.boolean().optional().default(false) });

export async function POST(request: Request) {
  try {
    const current = await getCurrentSession();
    if (!current) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const { includeCurrent } = schema.parse(await request.json().catch(() => ({})));

    await revokeAllSessions(current.userId, includeCurrent ? undefined : current.id);

    if (includeCurrent) {
      clearSessionCookie();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { getCurrentSession, revokeSession, clearSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const current = await getCurrentSession();
    if (!current) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    await revokeSession(params.id, current.userId);

    if (params.id === current.id) {
      clearSessionCookie();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

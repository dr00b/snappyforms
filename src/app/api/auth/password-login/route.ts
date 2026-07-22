import { NextResponse } from "next/server";
import { passwordLoginSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { needsOnboarding } from "@/lib/auth/users";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = passwordLoginSchema.parse(await request.json());
    const identifier = body.identifier.trim();

    const limit = checkRateLimit(`password-login:${identifier}`, 15 * 60 * 1000, 8);
    if (!limit.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const user = await db.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });

    if (!user?.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
    }

    const { token } = await createSession(user.id, request);
    setSessionCookie(token);
    await logAudit({ actorUserId: user.id, action: "login" });

    return NextResponse.json({ ok: true, needsOnboarding: await needsOnboarding(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { verifyCodeSchema } from "@/lib/validation";
import { verifyCode } from "@/lib/auth/otp";
import { findOrCreateUserByIdentifier, needsOnboarding } from "@/lib/auth/users";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = verifyCodeSchema.parse(await request.json());
    const identifier = body.identifier.trim();

    const result = await verifyCode(identifier, "LOGIN", body.code);
    if (!result.success) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    const user = await findOrCreateUserByIdentifier(identifier);
    const { token } = await createSession(user.id, request);
    setSessionCookie(token);
    await logAudit({ actorUserId: user.id, action: "login" });

    return NextResponse.json({ ok: true, needsOnboarding: await needsOnboarding(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

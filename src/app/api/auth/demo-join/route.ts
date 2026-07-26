import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";
import {
  DEMO_ORG_NAME,
  createGuestAuthorizer,
  createGuestParticipant,
  getOrCreateDemoOrg,
  isDemoMode,
} from "@/lib/demo";

const schema = z.object({ role: z.enum(["participant", "authorizer"]) });

/**
 * Provisions a throwaway demo identity so many audience members can each drive
 * their own participant/authorizer at the same time without sharing one seeded
 * account. Participants are dropped onto a pre-scoped "log a shift" form for the
 * shared demo org; authorizers land on that org's verification queue.
 */
export async function POST(request: Request) {
  try {
    if (!isDemoMode()) {
      return NextResponse.json({ error: "demo_mode_disabled" }, { status: 403 });
    }

    const { role } = schema.parse(await request.json());

    if (role === "participant") {
      const { user, handleValue } = await createGuestParticipant();
      const org = await getOrCreateDemoOrg();
      const { token } = await createSession(user.id, request);
      setSessionCookie(token);
      await logAudit({ actorUserId: user.id, action: "login" });

      // Beneficiary: log the shift at the shared demo org, then show your QR so
      // an authorizer can scan you and confirm it.
      const redirect =
        `/activity/new?orgId=${org.id}` +
        `&orgName=${encodeURIComponent(DEMO_ORG_NAME)}` +
        `&title=${encodeURIComponent("My volunteer shift")}`;
      return NextResponse.json({ ok: true, role, handle: handleValue, redirect });
    }

    const { user } = await createGuestAuthorizer();
    const { token } = await createSession(user.id, request);
    setSessionCookie(token);
    await logAudit({ actorUserId: user.id, action: "login" });

    // Authorizer: land on the QR scanner to scan a participant's code.
    return NextResponse.json({ ok: true, role, redirect: "/qr?tab=scan-code" });
  } catch (error) {
    return handleApiError(error);
  }
}

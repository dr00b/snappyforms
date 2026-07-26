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

const schema = z.object({
  role: z.enum(["participant", "authorizer"]),
  // "host-shift" sends an authorizer to start a rotating-QR shift instead of
  // the scan-a-participant queue. Two ways to reach the same signed record:
  // the participant logs it and the org approves, or the org hosts a shift and
  // the scan approves it outright.
  flow: z.enum(["host-shift"]).optional(),
});

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

    const { role, flow } = schema.parse(await request.json());

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

    const { user, org, membership } = await createGuestAuthorizer();
    const { token } = await createSession(user.id, request);
    setSessionCookie(token);
    await logAudit({ actorUserId: user.id, action: "login" });

    if (flow === "host-shift") {
      // Host: set up a shift and put its rotating QR on screen for volunteers.
      const redirect =
        `/organization/${org.id}/shifts/new` +
        `?title=${encodeURIComponent("Community meal service")}` +
        `&contact=${encodeURIComponent(membership.displayName ?? "Demo Verifier")}`;
      return NextResponse.json({ ok: true, role, flow, organizationId: org.id, redirect });
    }

    // Authorizer: land on the QR scanner to scan a participant's code.
    return NextResponse.json({
      ok: true,
      role,
      organizationId: org.id,
      redirect: "/qr?tab=scan-code",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

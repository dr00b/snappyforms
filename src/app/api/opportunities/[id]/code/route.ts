import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { generateQrDataUrl, shiftTargetUrl } from "@/lib/qr";
import { getVerifierEligibleMembership } from "@/lib/activity";
import { TOTP_STEP_SECONDS, currentCode, generateShiftSecret } from "@/lib/shiftTotp";

/**
 * The host view polls this once per step to refresh the QR it is displaying.
 * Only a verifier-eligible member sees it: the code is the org's signing
 * authority in transferable form for the next 30 seconds.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const opportunity = await db.volunteerOpportunity.findUnique({ where: { id: params.id } });
    if (!opportunity) {
      return NextResponse.json({ error: "shift_not_found" }, { status: 404 });
    }

    const membership = await getVerifierEligibleMembership(
      opportunity.organizationId,
      session.userId
    );
    if (!membership) {
      return NextResponse.json({ error: "not_a_member" }, { status: 403 });
    }

    // Opportunities created through the admin board predate this feature and
    // have no secret; the first host to open this view gives it one.
    let secret = opportunity.totpSecret;
    if (!secret) {
      secret = generateShiftSecret();
      await db.volunteerOpportunity.update({
        where: { id: opportunity.id },
        data: { totpSecret: secret },
      });
    }

    const { code, expiresAtMs } = currentCode(secret);
    const targetUrl = shiftTargetUrl(opportunity.id, code);

    return NextResponse.json({
      code,
      targetUrl,
      dataUrl: await generateQrDataUrl(targetUrl),
      expiresAt: new Date(expiresAtMs).toISOString(),
      stepSeconds: TOTP_STEP_SECONDS,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

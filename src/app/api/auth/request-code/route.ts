import { NextResponse } from "next/server";
import { requestCodeSchema } from "@/lib/validation";
import { identifierChannel } from "@/lib/auth/users";
import { createVerificationCode, CODE_TTL_MS } from "@/lib/auth/otp";
import { createMagicLinkToken } from "@/lib/auth/magicLink";
import { logNotification, buildOtpMessage } from "@/lib/notifications";
import { handleApiError } from "@/lib/apiError";

export async function POST(request: Request) {
  try {
    const body = requestCodeSchema.parse(await request.json());
    const identifier = body.identifier.trim();
    const channel = identifierChannel(identifier);

    if (body.purpose === "MAGIC_LINK") {
      const { token } = await createMagicLinkToken(identifier);
      const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
      const link = `${base}/api/auth/magic-link/consume?token=${token}`;
      await logNotification({
        channel,
        toIdentifier: identifier,
        subject: "Your VERWOVO sign-in link",
        body: `Tap to sign in: ${link}`,
      });
      return NextResponse.json({ ok: true, channel });
    }

    const { code } = await createVerificationCode(identifier, "LOGIN", channel);
    await logNotification({
      channel,
      toIdentifier: identifier,
      subject: "Your VERWOVO verification code",
      body: buildOtpMessage(code, "LOGIN"),
    });

    return NextResponse.json({ ok: true, channel, expiresInSeconds: CODE_TTL_MS / 1000 });
  } catch (error) {
    return handleApiError(error);
  }
}

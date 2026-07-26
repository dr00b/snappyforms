import { NextResponse } from "next/server";
import { z } from "zod";
import { identifierSchema } from "@/lib/validation";
import { identifierChannel } from "@/lib/auth/users";
import { createMagicLinkToken } from "@/lib/auth/magicLink";
import { logNotification } from "@/lib/notifications";
import { handleApiError } from "@/lib/apiError";

const schema = z.object({ identifier: identifierSchema });

export async function POST(request: Request) {
  try {
    const { identifier } = schema.parse(await request.json());
    const channel = identifierChannel(identifier);
    const { token } = await createMagicLinkToken(identifier);

    const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const link = `${base}/api/auth/magic-link/consume?token=${token}`;

    await logNotification({
      channel,
      toIdentifier: identifier,
      subject: "Your SnappyForms sign-in link",
      body: `Tap to sign in: ${link}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

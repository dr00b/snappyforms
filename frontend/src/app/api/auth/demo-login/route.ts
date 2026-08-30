import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { needsOnboarding } from "@/lib/auth/users";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/apiError";
import { logAudit } from "@/lib/audit";

const DEMO_ACCOUNTS: Record<string, string> = {
  maya: "maya.johnson@example-demo.org",
  "northside-admin": "renee@northside-center-demo.org",
  "keystone-admin": "sam@keystone-services-demo.com",
  "dcao-admin": "dcao-admin@example-demo.org",
};

const schema = z.object({
  seed: z.enum(["maya", "northside-admin", "keystone-admin", "dcao-admin"]),
});

export async function POST(request: Request) {
  try {
    if (process.env.DEMO_MODE !== "true") {
      return NextResponse.json({ error: "demo_mode_disabled" }, { status: 403 });
    }

    const { seed } = schema.parse(await request.json());
    const email = DEMO_ACCOUNTS[seed];
    const user = await db.user.findFirst({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "demo_account_not_seeded" }, { status: 404 });
    }

    const { token } = await createSession(user.id, request);
    setSessionCookie(token);
    await logAudit({ actorUserId: user.id, action: "login" });

    return NextResponse.json({ ok: true, needsOnboarding: await needsOnboarding(user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

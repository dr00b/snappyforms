import { NextResponse } from "next/server";
import { consumeMagicLinkToken } from "@/lib/auth/magicLink";
import { findOrCreateUserByIdentifier, needsOnboarding } from "@/lib/auth/users";
import { createSession, setSessionCookie } from "@/lib/auth/session";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const base = url.origin;

  if (!token) {
    return NextResponse.redirect(`${base}/login?error=missing_token`);
  }

  const record = await consumeMagicLinkToken(token);
  if (!record) {
    return NextResponse.redirect(`${base}/login?error=expired_link`);
  }

  const user = await findOrCreateUserByIdentifier(record.identifier);
  const { token: sessionToken } = await createSession(user.id, request);
  setSessionCookie(sessionToken);

  const destination = (await needsOnboarding(user.id)) ? "/onboarding" : "/dashboard";
  return NextResponse.redirect(`${base}${destination}`);
}

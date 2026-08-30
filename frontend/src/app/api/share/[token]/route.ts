import { NextResponse } from "next/server";
import { resolveShareLink } from "@/lib/shareLinks";
import { checkRateLimit } from "@/lib/auth/rateLimit";

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(`share:${ip}`, 60 * 1000, 20);
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const resolved = await resolveShareLink(params.token, { bumpAccess: true });

  if (resolved.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (resolved.status === "expired") {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  return NextResponse.json(resolved);
}

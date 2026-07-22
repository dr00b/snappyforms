import { NextResponse } from "next/server";
import { getCurrentSession, clearSessionCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getCurrentSession();
  if (session) {
    await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}

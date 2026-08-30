import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/constants";

export { SESSION_COOKIE, SESSION_TTL_MS };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  if (/iphone/i.test(userAgent)) return "iPhone";
  if (/android/i.test(userAgent)) return "Android device";
  if (/ipad/i.test(userAgent)) return "iPad";
  if (/mac os/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows PC";
  return "Browser";
}

export async function createSession(userId: string, request: Request) {
  const token = randomBytes(32).toString("hex");
  const userAgent = request.headers.get("user-agent");
  // Real IP capture needs a trusted proxy config; left as a placeholder per SECURITY.md.
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: describeDevice(userAgent),
      ipAddress,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return { token, session };
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Secure in production, except when explicitly opted out for local HTTP e2e
    // (e.g. the containerized Playwright stack serves the prod build over plain
    // http). Never set INSECURE_HTTP_COOKIES in a real deployment — a Secure
    // cookie is what keeps the session off unencrypted connections.
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_HTTP_COOKIES !== "true",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          participantProfile: { include: { handle: true, qrIdentifier: true } },
          organizationMembers: { include: { organization: { include: { handle: true, qrIdentifier: true } } } },
          agencyMembers: { include: { agency: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  db.session
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return session;
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function revokeSession(sessionId: string, userId: string) {
  await db.session.updateMany({
    where: { id: sessionId, userId },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await db.session.updateMany({
    where: { userId, id: exceptSessionId ? { not: exceptSessionId } : undefined, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

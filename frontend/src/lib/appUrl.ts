// Standalone (no Prisma/node-only imports) so this can be safely imported from
// edge middleware as well as regular server code.

const DEV_FALLBACK = "http://localhost:3000";

/**
 * The origin every user-facing absolute URL is built from: QR payloads, magic
 * links, share links — anything that leaves the app and has to survive a round
 * trip through someone's camera or inbox.
 *
 * Callers used to spell this `process.env.APP_BASE_URL ?? "http://localhost:3000"`.
 * That fallback is harmless locally and quietly catastrophic in production: an
 * unset variable mints QR codes and login links pointing at a dead origin, and
 * nothing surfaces until an attendee scans one. A deployment that cannot name
 * its own origin has nothing useful to degrade to, so this throws instead.
 */
export function appBaseUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_BASE_URL is not set. It is required in production — QR payloads, magic links and share links all encode it as an absolute origin.",
    );
  }

  return DEV_FALLBACK;
}

/**
 * The same origin as a parsed URL, or null when it is unset or unparseable.
 *
 * Unlike `appBaseUrl`, this never throws: middleware runs on every request, so
 * a misconfigured origin should cost us canonical-host redirects, not the whole
 * site.
 */
export function canonicalOrigin(): URL | null {
  const configured = process.env.APP_BASE_URL?.trim();
  if (!configured) return null;
  try {
    return new URL(configured);
  } catch {
    return null;
  }
}

/**
 * Hostnames that must never be redirected away from: container-internal health
 * checks, `docker compose` service names, and phones pointed at a dev machine's
 * LAN address. Compared against the Host header with any port already stripped.
 */
export function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    // RFC1918 / link-local, i.e. a dev box being reached from a phone on the
    // same wifi.
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^169\.254\./.test(hostname)
  );
}

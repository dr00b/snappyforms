import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { canonicalOrigin, isLocalHostname } from "@/lib/appUrl";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/qr",
  "/settings",
  "/onboarding",
  "/activity",
  "/notifications",
  "/forms",
  "/organization",
  "/agency",
  "/consent",
];

/**
 * Send every request to the one origin the app calls itself.
 *
 * App Hosting keeps the backend's default `*.hosted.app` hostname live and
 * serving after a custom domain is attached, so both origins answer with the
 * identical app. Every in-app link is relative, which means anyone who arrives
 * on the hosted.app origin — an old bookmark, a link shared during testing —
 * stays there for the whole session with the raw Firebase hostname showing in
 * Safari's URL pill. Only an HTTP redirect can move them; DNS cannot, because a
 * CNAME is resolved before the request and never changes what the browser
 * displays.
 *
 * Gated on the canonical origin being https, which scopes this to real
 * deployments: the docker stack sets APP_BASE_URL to http://localhost:3000 and
 * is reached at http://webapp:3000, so canonicalising there would bounce the
 * whole e2e suite to a host that does not exist inside the test container.
 */
function canonicalRedirect(request: NextRequest): NextResponse | null {
  const canonical = canonicalOrigin();
  if (!canonical || canonical.protocol !== "https:") return null;

  // The Host header is the hostname the user actually typed or scanned.
  const host = request.headers.get("host") ?? request.nextUrl.host;
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();
  if (isLocalHostname(hostname)) return null;

  // TLS terminates at Google's edge, so nextUrl.protocol is http even for
  // requests the user made over https. x-forwarded-proto is the real one; if
  // it is missing we are not behind the edge and should not guess.
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const isHttps = forwardedProto ? forwardedProto === "https" : request.nextUrl.protocol === "https:";

  if (hostname === canonical.hostname && isHttps) return null;

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical.origin);
  // 308 rather than 301/302: it preserves the method and body, and browsers
  // will not silently downgrade a POST to GET on the way through.
  return NextResponse.redirect(target, 308);
}

export function middleware(request: NextRequest) {
  const redirect = canonicalRedirect(request);
  if (redirect) return redirect;

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Broad on purpose: the canonical-host redirect has to reach paths the login
  // gate deliberately ignores, above all /shift/* — a scanned shift URL must be
  // moved to the canonical origin with its ?c= code intact, while still never
  // being bounced through /login (see the note in src/app/shift/[id]/page.tsx).
  // Login gating stays keyed off PROTECTED_PREFIXES, so widening this does not
  // put any new path behind auth.
  //
  // /api is excluded so server-to-server callers and platform health checks are
  // never redirected across origins.
  matcher: [
    "/((?!api/|_next/static|_next/image|_next/data|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|map|woff|woff2|ttf|otf|pdf)$).*)",
  ],
};

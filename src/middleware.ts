import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

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

export function middleware(request: NextRequest) {
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
  matcher: [
    "/dashboard/:path*",
    "/qr/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/activity/:path*",
    "/notifications/:path*",
    "/forms/:path*",
    "/organization/:path*",
    "/agency/:path*",
    "/consent/:path*",
  ],
};

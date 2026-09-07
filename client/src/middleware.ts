import { NextResponse, type NextRequest } from "next/server";

// The access token is an httpOnly, signed cookie - we can't decode its payload here
// (that needs the server-only JWT secret), only check whether it's present at all.
// A present-but-expired cookie is caught client-side by useCurrentUser() in the
// (dashboard) layout, which redirects on a failed fetch.
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/jobs", "/matches", "/applications", "/organization", "/settings", "/talents"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasAccessToken = request.cookies.has("accessToken");
  if (!hasAccessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/jobs/:path*",
    "/matches/:path*",
    "/applications/:path*",
    "/organization/:path*",
    "/settings/:path*",
    "/talents/:path*",
  ],
};

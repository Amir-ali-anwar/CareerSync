import { NextResponse } from "next/server";

export function middleware() {
  // Auth cookies are scoped to the API host, so they are not available to
  // middleware running on the frontend host. The dashboard layout validates
  // the session through the API and handles unauthenticated redirects.
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

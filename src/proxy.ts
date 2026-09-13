import { NextResponse, type NextRequest } from "next/server";

// Next 16: middleware file convention is now `proxy.ts` with a `proxy` export.
// Lightweight edge gate: the session cookie is an encrypted JWE we can't
// decode here, so we only check it exists. Full session + role verification
// happens server-side in each area's layout / server actions.
const SESSION_COOKIE = "authjs.session-token";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession =
    req.cookies.has(SESSION_COOKIE) ||
    req.cookies.has(`__Secure-${SESSION_COOKIE}`);

  if (!hasSession) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/vendor/:path*"],
};

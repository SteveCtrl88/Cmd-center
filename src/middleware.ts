import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Auth middleware:
 *  - /dashboard/* requires a valid session, otherwise redirect to /login
 *  - /api/* requires a valid session, otherwise return 401
 *
 * Exclusions:
 *  - /api/auth/* (NextAuth itself) is open
 *  - /api/cron/* is gated separately by CRON_SECRET inside the handler
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Preview/demo mode — bypass auth so the deploy preview is browsable
  // without real OAuth credentials. Remove before Phase 2.
  const previewMode =
    process.env.PREVIEW_MODE === "1" || process.env.PREVIEW_MODE === "true";
  if (previewMode) {
    return NextResponse.next();
  }

  // Public NextAuth + cron endpoints — let through here.
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    /*
     * Apply to all /api routes EXCEPT:
     *   /api/auth/*  (handled inside the function)
     *   /api/cron/*  (handled inside the function with CRON_SECRET)
     */
    "/api/:path*",
  ],
};

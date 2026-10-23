import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, roleSatisfies, verifySessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/pos/:path*", "/admin/:path*"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin's own login page lives under /admin/login — never gate that.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const needRole = pathname.startsWith("/admin") ? "admin" : "staff";
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const role = await verifySessionToken(token);

  if (!roleSatisfies(role, needRole)) {
    const loginPath = needRole === "admin" ? "/admin/login" : "/login";
    const url = req.nextUrl.clone();
    url.pathname = loginPath;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

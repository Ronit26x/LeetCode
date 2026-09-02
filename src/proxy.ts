import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (req.auth?.user) {
    if (pathname === "/login") return NextResponse.redirect(new URL("/today", req.nextUrl));
    return NextResponse.next();
  }
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  const login = new URL("/login", req.nextUrl);
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
});

export const config = {
  // Everything except auth routes, cron routes, Next internals, and static assets.
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|icons/|manifest.webmanifest|icon.png|apple-icon.png|favicon.ico|robots.txt).*)",
  ],
};

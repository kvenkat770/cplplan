import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/auth";

/** Everything except the login route, the login API and static assets. */
export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  const ok = await verifySession(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();

  // API calls get a clean 401 rather than an HTML redirect.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { unsealData } from "iron-session";

import { sessionOptions, type SessionData } from "@/lib/session";

// Next.js 16 renamed `middleware` -> `proxy`. Runs on the Node.js runtime.
export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page itself must stay reachable while logged out.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const seal = request.cookies.get(sessionOptions.cookieName)?.value;
  let isLoggedIn = false;

  if (seal && process.env.SESSION_SECRET) {
    try {
      const data = await unsealData<SessionData>(seal, {
        password: sessionOptions.password,
        ttl: sessionOptions.ttl,
      });
      isLoggedIn = data?.isLoggedIn === true;
    } catch {
      isLoggedIn = false;
    }
  }

  if (isLoggedIn) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

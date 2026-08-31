import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";

import { sessionOptions, type SessionData } from "@/lib/session";

/**
 * Reads (and, via `.save()` / `.destroy()`, writes) the admin session.
 * Only usable in Server Components, Route Handlers and Server Functions.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set — add it to .env.local");
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/**
 * Server-side gate for /api/admin/* route handlers. Returns a 401 `Response`
 * when the caller has no valid session, or `null` to proceed. The proxy already
 * blocks unauthenticated navigation to /admin; this is the belt-and-braces
 * check on the API itself.
 */
export async function requireAdmin(): Promise<Response | null> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

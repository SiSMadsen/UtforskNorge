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

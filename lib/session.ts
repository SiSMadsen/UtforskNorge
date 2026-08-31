import type { SessionOptions } from "iron-session";

/**
 * Shape of the encrypted admin session cookie. Single-admin, so there is no
 * user id — just a flag that the password check passed.
 */
export interface SessionData {
  isLoggedIn: boolean;
}

// 7 days. iron-session also derives the cookie Max-Age from this (ttl - 60s).
export const SESSION_TTL = 60 * 60 * 24 * 7;

/**
 * Pure config — safe to import from `proxy.ts`. Anything that needs to read or
 * write the session goes through `lib/auth.ts` (which pulls in `next/headers`
 * and must not be imported into the proxy).
 */
export const sessionOptions: SessionOptions = {
  cookieName: "norway_map_admin",
  password: process.env.SESSION_SECRET as string,
  ttl: SESSION_TTL,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

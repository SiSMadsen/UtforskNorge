import { compare } from "bcryptjs";

import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash || !process.env.SESSION_SECRET) {
    return Response.json(
      { error: "Admin auth is not configured on the server." },
      { status: 500 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") {
      password = body.password;
    }
  } catch {
    // No/invalid JSON body — treated as an empty password below.
  }

  if (!password || !(await compare(password, passwordHash))) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  return Response.json({ ok: true });
}

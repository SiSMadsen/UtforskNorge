import type { ReactNode } from "react";

import { getSession } from "@/lib/auth";

import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col">
      {session.isLoggedIn ? (
        <header className="flex items-center justify-between border-b border-black/10 px-6 py-3 dark:border-white/15">
          <span className="text-sm font-medium">Norway POI Map · Admin</span>
          <LogoutButton />
        </header>
      ) : null}
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

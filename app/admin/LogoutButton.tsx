"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="rounded border border-black/15 px-3 py-1 text-sm transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/[.06]"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Login failed.");
        return;
      }

      // Read the post-login target at submit time (client-only) so this
      // component renders deterministically on the server.
      const from = new URLSearchParams(window.location.search).get("from");
      const destination = from && from.startsWith("/admin") ? from : "/admin";
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6 dark:border-white/15"
    >
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Admin sign in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter the admin password to continue.
        </p>
      </div>

      <input
        type="password"
        name="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
      />

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="w-full rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

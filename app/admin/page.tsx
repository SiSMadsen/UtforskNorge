import Link from "next/link";

export default function AdminHome() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        You are signed in.
      </p>
      <Link
        href="/admin/map"
        className="mt-4 inline-block rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background"
      >
        Open map designer
      </Link>
    </div>
  );
}

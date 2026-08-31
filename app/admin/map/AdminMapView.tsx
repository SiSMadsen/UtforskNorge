"use client";

import dynamic from "next/dynamic";

// Leaflet + Leaflet.draw touch `window` at import time; load the designer
// browser-side only. `ssr: false` must live in a Client Component in Next 16.
const AdminMap = dynamic(() => import("./AdminMap").then((mod) => mod.AdminMap), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      Loading designer…
    </div>
  ),
});

export function AdminMapView() {
  return <AdminMap />;
}

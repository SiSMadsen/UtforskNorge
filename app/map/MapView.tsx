"use client";

import dynamic from "next/dynamic";

// Leaflet reads `window` at module load, so the map can only run in the browser.
// In Next.js 16 `ssr: false` is only allowed from within a Client Component,
// which is why this thin wrapper exists.
const MapCanvas = dynamic(
  () => import("./MapCanvas").then((mod) => mod.MapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center text-sm text-zinc-500">
        Loading map…
      </div>
    ),
  },
);

export function MapView() {
  return <MapCanvas />;
}

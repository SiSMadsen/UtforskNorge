import type { Metadata } from "next";

import { MapView } from "./map/MapView";

export const metadata: Metadata = {
  title: "Norway POI Map",
  description:
    "A read-only map of areas of outstanding beauty in Norway: hydropower stations, scenic roads, viewpoints, and more.",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <MapView />
    </main>
  );
}

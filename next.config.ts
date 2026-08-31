import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-leaflet 5 / @react-leaflet/core 3 re-run their map setup/teardown
  // effects under React StrictMode's dev double-invoke, which calls
  // `map.remove()` on the live map and leaves it half-destroyed
  // ("can't access property _leaflet_events"). Disable StrictMode until
  // @react-leaflet/core ships a fix. Only affects `next dev`.
  reactStrictMode: false,
};

export default nextConfig;

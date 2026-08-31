import L from "leaflet";

let applied = false;

/**
 * Leaflet's bundled marker icons don't survive bundling (Turbopack dev hands
 * back a URL-less object), so point the default icon at the copies served from
 * /public/leaflet. Call once from any client map component before it renders.
 */
export function setupLeafletDefaultIcon(): void {
  if (applied) return;
  applied = true;

  type IconDefaultPrototype = typeof L.Icon.Default.prototype & {
    _getIconUrl?: unknown;
  };
  delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "/leaflet/marker-icon.png",
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

"use client";

import { useEffect, useState } from "react";

import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import type { PoiCollection, RoadSegmentCollection } from "@/lib/geojson";

// Leaflet's bundled marker icons don't survive bundling (Turbopack dev in
// particular hands back a URL-less object), so point the default icon at the
// copies served from /public/leaflet instead.
type IconDefaultPrototype = typeof L.Icon.Default.prototype & {
  _getIconUrl?: unknown;
};
delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

const NORWAY_CENTER: [number, number] = [64.5, 11];
const NORWAY_ZOOM = 5;

// Kartverket topographic map (Web Mercator), free to use with attribution.
const KARTVERKET_TILE_URL =
  "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png";
const KARTVERKET_ATTRIBUTION =
  '&copy; <a href="https://www.kartverket.no/">Kartverket</a>';

// GeoJSON stores coordinates as [lng, lat]; Leaflet wants [lat, lng].
const toLatLng = ([lng, lat]: [number, number]): [number, number] => [lat, lng];

function FeaturePopup({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  return (
    <Popup>
      <strong>{title}</strong>
      {description ? (
        <p className="mt-1 whitespace-pre-line">{description}</p>
      ) : null}
    </Popup>
  );
}

export function MapCanvas() {
  const [pois, setPois] = useState<PoiCollection | null>(null);
  const [roadSegments, setRoadSegments] = useState<RoadSegmentCollection | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [poiRes, roadRes] = await Promise.all([
          fetch("/api/pois"),
          fetch("/api/road-segments"),
        ]);
        if (!poiRes.ok || !roadRes.ok) {
          throw new Error("Failed to load map data");
        }
        const [poiData, roadData] = (await Promise.all([
          poiRes.json(),
          roadRes.json(),
        ])) as [PoiCollection, RoadSegmentCollection];

        if (!cancelled) {
          setPois(poiData);
          setRoadSegments(roadData);
        }
      } catch (error) {
        if (!cancelled) console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-screen w-full">
      <MapContainer
        center={NORWAY_CENTER}
        zoom={NORWAY_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url={KARTVERKET_TILE_URL}
          attribution={KARTVERKET_ATTRIBUTION}
        />

        {pois?.features.map((feature) => (
          <Marker
            key={feature.properties.id}
            position={toLatLng(feature.geometry.coordinates)}
          >
            <FeaturePopup
              title={feature.properties.title}
              description={feature.properties.description}
            />
          </Marker>
        ))}

        {roadSegments?.features.map((feature) => (
          <Polyline
            key={feature.properties.id}
            positions={feature.geometry.coordinates.map(toLatLng)}
          >
            <FeaturePopup
              title={feature.properties.title}
              description={feature.properties.description}
            />
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
}

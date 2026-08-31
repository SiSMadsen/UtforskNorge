"use client";

import { useCallback, useEffect, useState } from "react";

import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  KARTVERKET_ATTRIBUTION,
  KARTVERKET_TILE_URL,
  NORWAY_CENTER,
  NORWAY_ZOOM,
  toLatLng,
} from "@/lib/map";
import type { PoiCollection, RoadSegmentCollection } from "@/lib/geojson";

import { DetailPanel, type Selection } from "./DetailPanel";

const poiPin = L.divIcon({
  className: "poi-pin-marker",
  html: '<span class="poi-pin"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const poiPinActive = L.divIcon({
  className: "poi-pin-marker",
  html: '<span class="poi-pin poi-pin--active"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const ROAD_IDLE = { color: "#35505c", weight: 3, opacity: 0.6 };
const ROAD_ACTIVE = { color: "#7a2e24", weight: 4, opacity: 1 };

export function MapCanvas() {
  const [pois, setPois] = useState<PoiCollection | null>(null);
  const [roadSegments, setRoadSegments] = useState<RoadSegmentCollection | null>(
    null,
  );
  const [selection, setSelection] = useState<Selection | null>(null);

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

  const closePanel = useCallback(() => setSelection(null), []);

  return (
    <div className="relative h-screen w-full">
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

        {pois?.features.map((feature) => {
          const active =
            selection?.kind === "poi" && selection.id === feature.properties.id;
          return (
            <Marker
              key={feature.properties.id}
              position={toLatLng(feature.geometry.coordinates)}
              icon={active ? poiPinActive : poiPin}
              eventHandlers={{
                click: () =>
                  setSelection({ kind: "poi", id: feature.properties.id }),
              }}
            />
          );
        })}

        {roadSegments?.features.map((feature) => {
          const active =
            selection?.kind === "road" && selection.id === feature.properties.id;
          return (
            <Polyline
              key={feature.properties.id}
              positions={feature.geometry.coordinates.map(toLatLng)}
              pathOptions={active ? ROAD_ACTIVE : ROAD_IDLE}
              eventHandlers={{
                click: () =>
                  setSelection({ kind: "road", id: feature.properties.id }),
              }}
            />
          );
        })}
      </MapContainer>

      <DetailPanel selection={selection} onClose={closePanel} />
    </div>
  );
}

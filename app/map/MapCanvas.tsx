"use client";

import { useEffect, useState } from "react";

import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { setupLeafletDefaultIcon } from "@/lib/leaflet-setup";
import {
  KARTVERKET_ATTRIBUTION,
  KARTVERKET_TILE_URL,
  NORWAY_CENTER,
  NORWAY_ZOOM,
  toLatLng,
} from "@/lib/map";
import type { PoiCollection, RoadSegmentCollection } from "@/lib/geojson";

setupLeafletDefaultIcon();

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

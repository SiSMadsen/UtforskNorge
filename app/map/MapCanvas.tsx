"use client";

import { useEffect, useState } from "react";

import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import type { PoiCollection, RoadSegmentCollection } from "@/lib/geojson";

// The bundler rewrites Leaflet's built-in icon URLs, so rebuild the default
// marker icon from the assets shipped in the `leaflet` package.
const markerDefaultIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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
      {description ? <p className="mt-1 whitespace-pre-line">{description}</p> : null}
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
            icon={markerDefaultIcon}
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

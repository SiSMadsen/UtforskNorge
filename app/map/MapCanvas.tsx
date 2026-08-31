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
import type {
  ImageRef,
  PoiCollection,
  RoadSegmentCollection,
} from "@/lib/geojson";

setupLeafletDefaultIcon();

function PopupGallery({ images }: { images: ImageRef[] }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;

  const current = Math.min(index, images.length - 1);
  const image = images[current];

  return (
    <div className="mt-2">
      <a href={image.url} target="_blank" rel="noreferrer">
        <span className="block h-32 w-full overflow-hidden rounded bg-black/5 dark:bg-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.caption ?? ""}
            className="h-full w-full object-contain"
          />
        </span>
      </a>
      {images.length > 1 ? (
        <div className="mt-1 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() =>
              setIndex((current - 1 + images.length) % images.length)
            }
            className="px-1"
          >
            ‹ Prev
          </button>
          <span>
            {current + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((current + 1) % images.length)}
            className="px-1"
          >
            Next ›
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FeaturePopup({
  title,
  description,
  images,
}: {
  title: string;
  description: string | null;
  images: ImageRef[];
}) {
  return (
    <Popup minWidth={200} maxWidth={260}>
      <strong>{title}</strong>
      {description ? (
        <p className="mt-1 whitespace-pre-line">{description}</p>
      ) : null}
      <PopupGallery images={images} />
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
              images={feature.properties.images}
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
              images={feature.properties.images}
            />
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
}

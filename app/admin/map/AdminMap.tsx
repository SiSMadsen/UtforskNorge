"use client";

import { useCallback, useEffect, useState } from "react";

import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { setupLeafletDefaultIcon } from "@/lib/leaflet-setup";
import {
  KARTVERKET_ATTRIBUTION,
  KARTVERKET_TILE_URL,
  NORWAY_CENTER,
  NORWAY_ZOOM,
  toLatLng,
} from "@/lib/map";
import type { LineString, Point } from "@/db/postgis";
import type {
  ImageRef,
  JournalEntry,
  PoiCollection,
  PoiFeature,
  RoadSegmentCollection,
  RoadSegmentFeature,
} from "@/lib/geojson";

import { DrawControl } from "./DrawControl";
import { FeatureForm } from "./FeatureForm";
import type { Draft, FeatureFormValues } from "./types";

setupLeafletDefaultIcon();

const POI_API = "/api/admin/pois";
const ROAD_API = "/api/admin/road-segments";

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${res.status}).`;
}

export function AdminMap() {
  const [pois, setPois] = useState<PoiFeature[]>([]);
  const [roads, setRoads] = useState<RoadSegmentFeature[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [poiData, roadData] = (await Promise.all([
          fetch("/api/pois").then((r) => r.json()),
          fetch("/api/road-segments").then((r) => r.json()),
        ])) as [PoiCollection, RoadSegmentCollection];
        if (!cancelled) {
          setPois(poiData.features);
          setRoads(roadData.features);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setNotice("Could not load existing features.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = useCallback((geometry: Point | LineString) => {
    setNotice(null);
    if (geometry.type === "Point") {
      setDraft({ kind: "poi", mode: "create", geometry });
    } else {
      setDraft({ kind: "road", mode: "create", geometry });
    }
  }, []);

  const patchFeatureProps = useCallback(
    (
      kind: "poi" | "road",
      id: string,
      patch: Partial<Pick<PoiFeature["properties"], "images" | "journalEntries">>,
    ) => {
      if (kind === "poi") {
        setPois((prev) =>
          prev.map((f) =>
            f.properties.id === id
              ? { ...f, properties: { ...f.properties, ...patch } }
              : f,
          ),
        );
      } else {
        setRoads((prev) =>
          prev.map((f) =>
            f.properties.id === id
              ? { ...f, properties: { ...f.properties, ...patch } }
              : f,
          ),
        );
      }
    },
    [],
  );

  const handleImagesChange = useCallback(
    (kind: "poi" | "road", id: string, images: ImageRef[]) =>
      patchFeatureProps(kind, id, { images }),
    [patchFeatureProps],
  );

  const handleJournalChange = useCallback(
    (kind: "poi" | "road", id: string, journalEntries: JournalEntry[]) =>
      patchFeatureProps(kind, id, { journalEntries }),
    [patchFeatureProps],
  );

  async function submitDraft(values: FeatureFormValues) {
    if (!draft) return;
    const isPoi = draft.kind === "poi";
    const apiBase = isPoi ? POI_API : ROAD_API;

    const payload: Record<string, unknown> = {
      title: values.title,
      description: values.description,
    };
    if (isPoi) payload.category = values.category;

    let res: Response;
    if (draft.mode === "create") {
      payload.geometry = draft.geometry;
      res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${apiBase}/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) throw new Error(await readError(res));

    const { feature } = (await res.json()) as {
      feature: PoiFeature | RoadSegmentFeature;
    };

    if (isPoi) {
      const f = feature as PoiFeature;
      setPois((prev) =>
        draft.mode === "create"
          ? [...prev, f]
          : prev.map((x) => (x.properties.id === f.properties.id ? f : x)),
      );
    } else {
      const f = feature as RoadSegmentFeature;
      setRoads((prev) =>
        draft.mode === "create"
          ? [...prev, f]
          : prev.map((x) => (x.properties.id === f.properties.id ? f : x)),
      );
    }
    setDraft(null);
  }

  async function deleteFeature(kind: "poi" | "road", id: string) {
    const apiBase = kind === "poi" ? POI_API : ROAD_API;
    const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      setNotice(await readError(res));
      return;
    }
    if (kind === "poi") {
      setPois((prev) => prev.filter((x) => x.properties.id !== id));
    } else {
      setRoads((prev) => prev.filter((x) => x.properties.id !== id));
    }
    setDraft((d) => (d?.mode === "edit" && d.id === id ? null : d));
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-black/10 dark:border-white/15">
        <p className="border-b border-black/10 p-3 text-xs text-zinc-600 dark:border-white/15 dark:text-zinc-400">
          Use the draw tools (top-right of the map) to add a point or a line.
          Click a map feature or a list row to edit it.
        </p>

        {notice ? (
          <p className="border-b border-black/10 p-3 text-xs text-red-600 dark:border-white/15 dark:text-red-400">
            {notice}
          </p>
        ) : null}

        <ListSection
          heading={`POIs (${pois.length})`}
          empty={loaded ? "No POIs yet." : "Loading…"}
          rows={pois.map((f) => ({
            id: f.properties.id,
            title: f.properties.title,
            subtitle: f.properties.category,
            onEdit: () =>
              setDraft({
                kind: "poi",
                mode: "edit",
                id: f.properties.id,
                feature: f,
              }),
            onDelete: () => {
              if (confirm(`Delete POI “${f.properties.title}”?`)) {
                void deleteFeature("poi", f.properties.id);
              }
            },
          }))}
        />

        <ListSection
          heading={`Road segments (${roads.length})`}
          empty={loaded ? "No road segments yet." : "Loading…"}
          rows={roads.map((f) => ({
            id: f.properties.id,
            title: f.properties.title,
            subtitle: null,
            onEdit: () =>
              setDraft({
                kind: "road",
                mode: "edit",
                id: f.properties.id,
                feature: f,
              }),
            onDelete: () => {
              if (confirm(`Delete road segment “${f.properties.title}”?`)) {
                void deleteFeature("road", f.properties.id);
              }
            },
          }))}
        />
      </aside>

      <div className="relative flex-1">
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
          <DrawControl onCreate={handleCreate} />

          {pois.map((f) => (
            <Marker
              key={f.properties.id}
              position={toLatLng(f.geometry.coordinates)}
              eventHandlers={{
                click: () =>
                  setDraft({
                    kind: "poi",
                    mode: "edit",
                    id: f.properties.id,
                    feature: f,
                  }),
              }}
            />
          ))}

          {roads.map((f) => (
            <Polyline
              key={f.properties.id}
              positions={f.geometry.coordinates.map(toLatLng)}
              eventHandlers={{
                click: () =>
                  setDraft({
                    kind: "road",
                    mode: "edit",
                    id: f.properties.id,
                    feature: f,
                  }),
              }}
            />
          ))}
        </MapContainer>

        {draft ? (
          <FeatureForm
            key={
              draft.mode === "create"
                ? `create-${draft.kind}`
                : `edit-${draft.kind}-${draft.id}`
            }
            draft={draft}
            onSubmit={submitDraft}
            onCancel={() => setDraft(null)}
            onImagesChange={handleImagesChange}
            onJournalChange={handleJournalChange}
          />
        ) : null}
      </div>
    </div>
  );
}

type Row = {
  id: string;
  title: string;
  subtitle: string | null;
  onEdit: () => void;
  onDelete: () => void;
};

function ListSection({
  heading,
  empty,
  rows,
}: {
  heading: string;
  empty: string;
  rows: Row[];
}) {
  return (
    <section className="border-b border-black/10 dark:border-white/15">
      <h2 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {heading}
      </h2>
      {rows.length === 0 ? (
        <p className="px-3 pb-3 text-xs text-zinc-500">{empty}</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.04]"
            >
              <button
                type="button"
                onClick={row.onEdit}
                className="min-w-0 flex-1 truncate text-left"
                title={row.title}
              >
                {row.title}
                {row.subtitle ? (
                  <span className="ml-1 text-xs text-zinc-500">
                    · {row.subtitle}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={row.onEdit}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={row.onDelete}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

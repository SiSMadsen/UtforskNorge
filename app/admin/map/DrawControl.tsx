"use client";

import { useEffect } from "react";

import L from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

import type { LineString, Point } from "@/db/postgis";

/**
 * Adds the Leaflet.draw toolbar, limited to marker + polyline. The drawn shape
 * is never added to the map — we hand its geometry up and let the parent open
 * the editor form, then re-render from server state on save.
 */
export function DrawControl({
  onCreate,
}: {
  onCreate: (geometry: Point | LineString) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const control = new L.Control.Draw({
      position: "topright",
      draw: {
        marker: {},
        polyline: {},
        polygon: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
      },
      // No edit toolbar — editing/deleting is done from the sidebar.
    });
    map.addControl(control);

    function handleCreated(event: L.LeafletEvent) {
      const { layerType, layer } = event as unknown as {
        layerType: string;
        layer: L.Layer;
      };

      if (layerType === "marker") {
        const { lat, lng } = (layer as L.Marker).getLatLng();
        onCreate({ type: "Point", coordinates: [lng, lat] });
      } else if (layerType === "polyline") {
        const latlngs = (layer as L.Polyline).getLatLngs() as L.LatLng[];
        onCreate({
          type: "LineString",
          coordinates: latlngs.map((ll) => [ll.lng, ll.lat]),
        });
      }
    }

    map.on(L.Draw.Event.CREATED, handleCreated);
    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.removeControl(control);
    };
  }, [map, onCreate]);

  return null;
}

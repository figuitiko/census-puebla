"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { STATE_LABELS, type UnitState } from "../filters";
import type { UnitRow } from "../rows";

// Class names map to the same CSS tokens as the chart (see globals.css), so map and chart share one palette.
const STATE_CLASS: Record<UnitState, string> = {
  APPROVED: "state-approved",
  SUBMITTED: "state-submitted",
  DRAFT: "state-draft",
  RETURNED: "state-returned",
  NOT_STARTED: "state-notstarted",
};

const PUEBLA: [number, number] = [19.0414, -98.2063];
const MARKER_RADIUS = 10; // 20px dot + 2px ring: clears the 24px hit-target guideline

type Point = Pick<UnitRow, "id" | "folio" | "name" | "state" | "lat" | "lng">;

export function UnitMap({ units, linkToDossier = true }: { units: Point[]; linkToDossier?: boolean }) {
  const points = units.filter((u): u is Point & { lat: number; lng: number } => u.lat !== null && u.lng !== null);
  const missing = units.length - points.length;

  if (points.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center rounded-md border text-sm text-muted-foreground">
        Ninguna unidad tiene coordenadas todavía.
      </p>
    );
  }

  const single = points.length === 1;

  return (
    <div className="flex flex-col gap-2">
      {/* isolate: Leaflet panes use high z-indexes that would otherwise float over the sidebar and dialogs */}
      <div className="isolate h-80 overflow-hidden rounded-md border">
        <MapContainer
          className="size-full"
          {...(single
            ? { center: [points[0].lat, points[0].lng] as [number, number], zoom: 16 }
            : {
                center: PUEBLA,
                zoom: 12,
                bounds: points.map((p): [number, number] => [p.lat, p.lng]),
                boundsOptions: { padding: [32, 32], maxZoom: 17 },
              })}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={MARKER_RADIUS}
              pathOptions={{ className: `unit-marker ${STATE_CLASS[point.state]}` }}
            >
              <Popup>
                <p className="font-mono text-xs">{point.folio}</p>
                <p className="font-semibold">{point.name}</p>
                <p className="text-xs">{STATE_LABELS[point.state]}</p>
                {linkToDossier && (
                  <Link href={`/unidades/${point.id}`} className="text-xs underline">
                    Ver expediente
                  </Link>
                )}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      {missing > 0 && (
        <p className="text-xs text-muted-foreground">
          {missing} {missing === 1 ? "unidad sin coordenadas" : "unidades sin coordenadas"} no se muestran en el mapa.
        </p>
      )}
    </div>
  );
}

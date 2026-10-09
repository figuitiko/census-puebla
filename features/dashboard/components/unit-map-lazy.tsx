"use client";

import dynamic from "next/dynamic";

/** Leaflet touches `window` on import, so it must never run during SSR. */
export const UnitMap = dynamic(() => import("./unit-map").then((m) => m.UnitMap), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-md bg-muted" aria-label="Cargando mapa" />,
});

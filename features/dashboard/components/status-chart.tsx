"use client";

import { useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATE_COLOR } from "../colors";
import { STACK_ORDER, STATE_LABELS, type UnitState } from "../filters";
import type { BreakdownRow } from "../metrics";

type Tip = { x: number; y: number; row: BreakdownRow; state: UnitState };

const TIP_OFFSET = 12;

/**
 * Stacked horizontal bars: part-to-whole of unit states per encuestador. Bar length = the encuestador's units,
 * segments = states. Labels never sit inside segments (they would clip); values live in the tooltip, the
 * legend totals and the table twin below.
 */
export function StatusChart({
  rows,
  totals,
}: {
  rows: BreakdownRow[];
  totals: { state: UnitState; count: number }[];
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.total));

  function show(event: { clientX: number; clientY: number }, row: BreakdownRow, state: UnitState) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: event.clientX - box.left + TIP_OFFSET, y: event.clientY - box.top - TIP_OFFSET, row, state });
  }

  function showFromFocus(element: HTMLElement, row: BreakdownRow, state: UnitState) {
    const box = frame.current?.getBoundingClientRect();
    const target = element.getBoundingClientRect();
    if (!box) return;
    setTip({ x: target.left - box.left + target.width / 2, y: target.top - box.top - TIP_OFFSET, row, state });
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay unidades con estos filtros.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Legend: always present for 2+ series; it also carries the overall totals. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {totals.map(({ state, count }) => (
          <li key={state} className="flex items-center gap-2">
            <span className="size-3 rounded-[3px]" style={{ background: STATE_COLOR[state] }} aria-hidden />
            <span className="text-muted-foreground">{STATE_LABELS[state]}</span>
            <span className="font-medium">{count}</span>
          </li>
        ))}
      </ul>

      <div ref={frame} className="relative flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr]">
            <span className="truncate text-sm text-muted-foreground" title={row.label}>
              {row.label}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-5 gap-[2px]" style={{ width: `calc((100% - 2rem) * ${row.total / max})` }}>
                {STACK_ORDER.filter((state) => row.counts[state] > 0).map((state) => (
                  <button
                    key={state}
                    type="button"
                    aria-label={`${row.label}: ${STATE_LABELS[state]}, ${row.counts[state]}`}
                    className="h-full min-w-[3px] rounded-none outline-offset-2 transition-[filter] last:rounded-r-[4px] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring"
                    style={{ flexGrow: row.counts[state], flexBasis: 0, background: STATE_COLOR[state] }}
                    onPointerMove={(event) => show(event, row, state)}
                    onPointerLeave={() => setTip(null)}
                    onFocus={(event) => showFromFocus(event.currentTarget, row, state)}
                    onBlur={() => setTip(null)}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{row.total}</span>
            </div>
          </div>
        ))}

        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 min-w-36 -translate-y-full rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md"
            style={{ left: tip.x, top: tip.y }}
          >
            <p className="text-sm font-semibold">
              {tip.row.counts[tip.state]} {tip.row.counts[tip.state] === 1 ? "unidad" : "unidades"} ·{" "}
              {Math.round((tip.row.counts[tip.state] / tip.row.total) * 100)}%
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-[3px] w-4 rounded-full" style={{ background: STATE_COLOR[tip.state] }} aria-hidden />
              {STATE_LABELS[tip.state]}
            </p>
            <p className="text-xs text-muted-foreground">{tip.row.label}</p>
          </div>
        )}
      </div>

      {/* Table twin: every value above is reachable without hover or color. */}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground underline">Ver como tabla</summary>
        <Table className="mt-2">
          <TableHeader>
            <TableRow>
              <TableHead>Encuestador</TableHead>
              {STACK_ORDER.map((state) => (
                <TableHead key={state} className="text-right">
                  {STATE_LABELS[state]}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{row.label}</TableCell>
                {STACK_ORDER.map((state) => (
                  <TableCell key={state} className="text-right tabular-nums">
                    {row.counts[state]}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium tabular-nums">{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  );
}

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATE_LABELS } from "../filters";
import type { UnitRow } from "../rows";
import { STATE_COLOR } from "../colors";

/** The table twin of the chart and map: same filtered rows, every value readable without color or hover. */
export function RegistryTable({ rows, minPhotos }: { rows: UnitRow[]; minPhotos: number }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay unidades con estos filtros.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Conjunto</TableHead>
          <TableHead>Colonia</TableHead>
          <TableHead>Encuestador</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Fotos</TableHead>
          <TableHead className="text-right">Viviendas</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono">
              <Link href={`/unidades/${row.id}`} className="underline">
                {row.folio}
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              {row.name}
              {!row.inScope && <span className="ml-2 text-xs font-normal text-muted-foreground">(descubierta)</span>}
            </TableCell>
            <TableCell>{row.colonia ?? "—"}</TableCell>
            <TableCell>{row.assigneeName ?? <span className="text-muted-foreground">Sin asignar</span>}</TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-[3px]" style={{ background: STATE_COLOR[row.state] }} aria-hidden />
                {STATE_LABELS[row.state]}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.located === true ? `${row.photos}/${minPhotos}` : "—"}
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.dwellings ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

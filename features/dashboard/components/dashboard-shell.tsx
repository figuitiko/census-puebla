"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STATE_LABELS, UNIT_STATES, hasActiveFilters, type UnitFilters } from "../filters";

const ALL = "all"; // Radix Select cannot use "" as a value

type Props = {
  filters: UnitFilters;
  options: {
    colonias: string[];
    juntas: string[];
    assignees: { id: string; name: string }[];
  };
  children: ReactNode;
};

/**
 * ONE filter row above everything it scopes (never per chart). The URL is the state, so a filtered view is
 * linkable. While the server re-renders, the previous content stays in place at reduced opacity: no skeleton, no jump.
 */
export function DashboardShell({ filters, options, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(search.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap" role="group" aria-label="Filtros">
        <FilterSelect
          label="Estado"
          value={filters.state ?? ALL}
          onChange={(v) => setParam("state", v)}
          items={[[ALL, "Todos"], ...UNIT_STATES.map((s): [string, string] => [s, STATE_LABELS[s]])]}
        />
        <FilterSelect
          label="Colonia"
          value={filters.colonia ?? ALL}
          onChange={(v) => setParam("colonia", v)}
          items={[[ALL, "Todas"], ...options.colonias.map((c): [string, string] => [c, c])]}
        />
        <FilterSelect
          label="Junta auxiliar"
          value={filters.junta ?? ALL}
          onChange={(v) => setParam("junta", v)}
          items={[[ALL, "Todas"], ...options.juntas.map((j): [string, string] => [j, j])]}
        />
        <FilterSelect
          label="Encuestador"
          value={filters.assignee ?? ALL}
          onChange={(v) => setParam("assignee", v)}
          items={[
            [ALL, "Todos"],
            ["none", "Sin asignar"],
            ...options.assignees.map((a): [string, string] => [a.id, a.name]),
          ]}
        />
        <FilterSelect
          label="Alcance"
          value={filters.scope}
          onChange={(v) => setParam("scope", v === ALL ? ALL : v)}
          items={[
            ["all", "Todas"],
            ["in", "En alcance"],
            ["out", "Descubiertas"],
          ]}
        />
        {hasActiveFilters(filters) && (
          <Button variant="ghost" size="sm" onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}>
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className={cn("flex flex-col gap-6 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
        {children}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: [value: string, label: string][];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(([itemValue, itemLabel]) => (
            <SelectItem key={itemValue} value={itemValue}>
              {itemLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

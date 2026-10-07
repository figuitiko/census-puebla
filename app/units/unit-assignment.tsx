"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignUnit, planUnit, type ActionState } from "./actions";

const UNASSIGNED = "none"; // Radix Select cannot use an empty string as a value

type Props = {
  unitId: string;
  assigneeId: string | null;
  plannedDate: string;
  encuestadores: { id: string; name: string }[];
};

function notify(result: ActionState) {
  if (result.ok) toast.success("Guardado");
  else toast.error(result.error ?? "Algo salió mal");
}

export function UnitAssignment({ unitId, assigneeId, plannedDate, encuestadores }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={assigneeId ?? UNASSIGNED}
        disabled={pending}
        onValueChange={(next) =>
          startTransition(async () => notify(await assignUnit(unitId, next === UNASSIGNED ? null : next)))
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
          {encuestadores.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="date"
        className="w-40"
        defaultValue={plannedDate}
        disabled={pending}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(async () => notify(await planUnit(unitId, value)));
        }}
      />
    </div>
  );
}

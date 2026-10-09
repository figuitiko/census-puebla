"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONTRACT_MIN_PHOTOS } from "@/lib/campaign-rules";
import { saveCampaign, type ActionState } from "./actions";

type Props = {
  defaults?: {
    name: string;
    municipality: string;
    startsOn: string;
    endsOn: string;
    minPhotos: number;
  } | null;
};

const initialState: ActionState = { ok: false };

export function CampaignForm({ defaults }: Props) {
  const [minPhotos, setMinPhotos] = useState(String(defaults?.minPhotos ?? CONTRACT_MIN_PHOTOS));
  const belowContract = Number(minPhotos) < CONTRACT_MIN_PHOTOS;
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveCampaign(prev, formData);
      if (result.ok) toast.success("Campaña guardada");
      return result;
    },
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required defaultValue={defaults?.name} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="municipality">Municipio</Label>
        <Input id="municipality" name="municipality" required defaultValue={defaults?.municipality ?? "Puebla"} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsOn">Inicio</Label>
          <Input id="startsOn" name="startsOn" type="date" required defaultValue={defaults?.startsOn} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endsOn">Fin</Label>
          <Input id="endsOn" name="endsOn" type="date" required defaultValue={defaults?.endsOn} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="minPhotos">Fotos válidas requeridas por unidad localizada</Label>
        <Input id="minPhotos" name="minPhotos" type="number" min={0} required value={minPhotos} onChange={(event) => setMinPhotos(event.target.value)} />
        {belowContract && (
          <p role="status" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
            Valor de prueba: el levantamiento real exige {CONTRACT_MIN_PHOTOS} fotos por unidad localizada. Restablecelo
            antes de usar datos reales.
          </p>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar campaña"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUnit, type ActionState } from "./actions";

const initialState: ActionState = { ok: false };

const FIELDS = [
  { name: "name", label: "Nombre del conjunto", required: true },
  { name: "address", label: "Dirección" },
  { name: "juntaAuxiliar", label: "Junta auxiliar" },
  { name: "colonia", label: "Colonia" },
] as const;

export function CreateUnitDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createUnit(prev, formData);
      if (result.ok) {
        toast.success("Unidad creada");
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nueva unidad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva unidad habitacional</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          {FIELDS.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input id={field.name} name={field.name} required={"required" in field} />
            </div>
          ))}
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear unidad"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

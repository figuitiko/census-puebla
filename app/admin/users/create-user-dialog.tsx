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
import { createUser, type ActionState } from "./actions";
import { RoleSelect } from "./role-select";

const initialState: ActionState = { ok: false };

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createUser(prev, formData);
      if (result.ok) {
        toast.success("Usuario creado");
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuevo usuario</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña temporal</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rol</Label>
            <RoleSelect name="role" defaultValue="ENCUESTADOR" />
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear usuario"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

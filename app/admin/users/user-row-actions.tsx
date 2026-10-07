"use client";

import { useActionState, useState, useTransition } from "react";
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
import type { Role } from "@/lib/generated/prisma/enums";
import { resetPassword, setUserActive, setUserRole, type ActionState } from "./actions";
import { RoleSelect } from "./role-select";

type Props = { userId: string; role: Role; active: boolean; isSelf: boolean };

const initialState: ActionState = { ok: false };

function notify(result: ActionState, success: string) {
  if (result.ok) toast.success(success);
  else toast.error(result.error ?? "Algo salió mal");
}

export function UserRowActions({ userId, role, active, isSelf }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-2">
      <RoleSelect
        value={role}
        disabled={isSelf || pending}
        onValueChange={(next) =>
          startTransition(async () => notify(await setUserRole(userId, next), "Rol actualizado"))
        }
      />
      <ResetPasswordDialog userId={userId} />
      <Button
        variant="outline"
        size="sm"
        disabled={isSelf || pending}
        onClick={() =>
          startTransition(async () =>
            notify(await setUserActive(userId, !active), active ? "Usuario desactivado" : "Usuario activado"),
          )
        }
      >
        {active ? "Desactivar" : "Activar"}
      </Button>
    </div>
  );
}

function ResetPasswordDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await resetPassword(userId, prev, formData);
      if (result.ok) {
        toast.success("Contraseña actualizada");
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Contraseña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Nueva contraseña" />
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

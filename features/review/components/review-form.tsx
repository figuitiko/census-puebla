"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reviewCedula } from "../actions";

export function ReviewForm({ unitId, version }: { unitId: string; version: number }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(decision: "APPROVED" | "RETURNED") {
    setBusy(true);
    const result = await reviewCedula(unitId, version, decision, comment);
    if (!result.ok) {
      toast.error(result.error);
      setBusy(false);
      return;
    }
    toast.success(decision === "APPROVED" ? "Cédula aprobada" : "Cédula devuelta");
    router.replace("/review");
    router.refresh();
  }

  const canReturn = comment.trim().length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <Label htmlFor="review-comment">Comentario</Label>
      <Textarea
        id="review-comment"
        rows={4}
        maxLength={2000}
        value={comment}
        disabled={busy}
        placeholder="Obligatorio al devolver: indicá qué hay que corregir."
        onChange={(event) => setComment(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={busy}>Aprobar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Aprobar esta cédula?</AlertDialogTitle>
              <AlertDialogDescription>
                Queda bloqueada para el encuestador y cuenta como aprobada en el tablero.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void decide("APPROVED")}>Aprobar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" disabled={busy || !canReturn} onClick={() => void decide("RETURNED")}>
          Devolver al encuestador
        </Button>
      </div>
    </div>
  );
}

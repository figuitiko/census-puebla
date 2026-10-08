"use client";

import { upload } from "@vercel/blob/client";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteEvidence, confirmEvidence } from "@/features/evidence/actions";
import { evidencePrefix, safeFileName } from "@/lib/blob";

type Props = {
  unitId: string;
  submissionId: string | null;
  photos: { id: string }[];
  minPhotos: number;
  required: boolean;
  disabled: boolean;
  /** Saves the draft so a submission (and its upload prefix) exists. Returns its id, or null on failure. */
  ensureSaved: () => Promise<string | null>;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
};

export function Photos({ unitId, submissionId, photos, minPhotos, required, disabled, ensureSaved, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const uploading = progress !== null;

  async function onFiles(files: File[]) {
    if (files.length === 0) return;
    const sid = submissionId ?? (await ensureSaved());
    if (!sid) return;

    setProgress({ done: 0, total: files.length });
    for (const [index, file] of files.entries()) {
      try {
        const blob = await upload(`${evidencePrefix(sid)}${safeFileName(file.name)}`, file, {
          access: "private",
          handleUploadUrl: "/api/evidence/upload",
          clientPayload: JSON.stringify({ unitId }),
        });
        const result = await confirmEvidence(unitId, blob.pathname);
        if (result.ok) onAdd(result.id);
        else toast.error(`${file.name}: ${result.error}`);
      } catch (error) {
        toast.error(`${file.name}: ${error instanceof Error ? error.message : "no se pudo subir"}`);
      }
      setProgress({ done: index + 1, total: files.length });
    }
    setProgress(null);
  }

  async function remove(id: string) {
    const result = await deleteEvidence(unitId, id);
    if (result.ok) onRemove(id);
    else toast.error(result.error);
  }

  const enough = photos.length >= minPhotos;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">25. Evidencia fotográfica</p>
        <Badge variant={enough || !required ? "default" : "secondary"}>
          {photos.length}/{minPhotos}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {required
          ? `Se requieren al menos ${minPhotos} fotos georreferenciadas.`
          : "Opcional: la unidad no fue localizada."}{" "}
        Imágenes de hasta 15 MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = ""; // allow re-selecting the same file
          void onFiles(files);
        }}
      />
      <Button type="button" variant="outline" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
        <ImagePlus />
        {uploading ? `Subiendo ${progress.done + 1} de ${progress.total}…` : "Agregar fotos"}
      </Button>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              {/* Private route: next/image would need the optimizer to authenticate, a plain img is intended. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/evidence/${photo.id}`} alt={`Foto ${index + 1}`} loading="lazy" className="size-full object-cover" />
              {!disabled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-1 top-1 size-7"
                      aria-label={`Quitar foto ${index + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Quitar esta foto?</AlertDialogTitle>
                      <AlertDialogDescription>Se elimina de la cédula y no se puede recuperar.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void remove(photo.id)}>Quitar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
import { Progress } from "@/components/ui/progress";
import { deleteEvidence, confirmEvidence } from "@/features/evidence/actions";
import { BLOB_ACCESS, evidencePrefix, safeFileName } from "@/lib/blob";

const UPLOAD_TIMEOUT_MS = 120_000;

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
  const [progress, setProgress] = useState<{ done: number; total: number; percent: number } | null>(null);
  const uploading = progress !== null;
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  async function onFiles(files: File[]) {
    if (files.length === 0) return;
    const sid = submissionId ?? (await ensureSaved());
    if (!sid) return;

    cancelledRef.current = false;
    setProgress({ done: 0, total: files.length, percent: 0 });

    for (const [index, file] of files.entries()) {
      if (cancelledRef.current) break;

      // The SDK retries failed requests with backoff for minutes, so a rejected upload would look
      // frozen. Abort after UPLOAD_TIMEOUT_MS and tell the user instead.
      const controller = new AbortController();
      abortRef.current = controller;
      const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      try {
        const blob = await upload(`${evidencePrefix(sid)}${safeFileName(file.name)}`, file, {
          access: BLOB_ACCESS,
          handleUploadUrl: "/api/evidence/upload",
          clientPayload: JSON.stringify({ unitId }),
          abortSignal: controller.signal,
          onUploadProgress: ({ percentage }) =>
            setProgress({ done: index, total: files.length, percent: Math.round(percentage) }),
        });
        const result = await confirmEvidence(unitId, blob.pathname);
        if (result.ok) onAdd(result.id);
        else toast.error(`${file.name}: ${result.error}`);
      } catch (error) {
        if (cancelledRef.current) break;
        const timedOut = error instanceof Error && error.name.includes("Abort");
        toast.error(
          timedOut
            ? `${file.name}: tardó demasiado en subir. Revisá tu conexión o avisá al administrador.`
            : `${file.name}: ${error instanceof Error ? error.message : "no se pudo subir"}`,
        );
      } finally {
        clearTimeout(timer);
      }
      setProgress({ done: index + 1, total: files.length, percent: 0 });
    }
    abortRef.current = null;
    setProgress(null);
  }

  function cancel() {
    cancelledRef.current = true;
    abortRef.current?.abort();
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
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus />
          {uploading
            ? `Subiendo ${Math.min(progress.done + 1, progress.total)} de ${progress.total}… ${progress.percent}%`
            : "Agregar fotos"}
        </Button>
        {uploading && (
          <Button type="button" variant="ghost" onClick={cancel}>
            Cancelar
          </Button>
        )}
      </div>
      {uploading && <Progress value={progress.percent} />}

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

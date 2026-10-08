"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { STATUS_LABELS } from "@/lib/catalogs";
import type { SubmissionStatus } from "@/lib/generated/prisma/enums";
import { saveCedula, submitCedula } from "../actions";
import { NOT_LOCATED_STEPS, STEPS, type CedulaValues, type Issue } from "../schema";
import { Photos } from "./photos";
import { SectionA, SectionB, SectionC, SectionD, SectionE } from "./sections";

type Props = {
  unitId: string;
  folio: string;
  status: SubmissionStatus;
  initialVersion: number | null;
  initialSubmissionId: string | null;
  initialPhotos: { id: string }[];
  minPhotos: number;
  initialValues: CedulaValues;
  visitedAt: string | null;
  responsible: string;
  readOnly: boolean;
};

const ALL_STEPS = [0, 1, 2, 3, 4];

export function Wizard({
  unitId,
  folio,
  status,
  initialVersion,
  initialSubmissionId,
  initialPhotos,
  minPhotos,
  initialValues,
  visitedAt,
  responsible,
  readOnly,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [version, setVersion] = useState(initialVersion);
  const [submissionId, setSubmissionId] = useState(initialSubmissionId);
  const [photos, setPhotos] = useState(initialPhotos);
  const [position, setPosition] = useState(0);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  const visible: readonly number[] = values.located === false ? NOT_LOCATED_STEPS : ALL_STEPS;
  const step = visible[Math.min(position, visible.length - 1)];
  const isLast = position >= visible.length - 1;

  function set<K extends keyof CedulaValues>(key: K, value: CedulaValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /** Persists the draft. Returns the saved version + submission id, or null if it failed (already toasted). */
  async function persist() {
    const result = await saveCedula(unitId, version, values);
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    setVersion(result.version);
    setSubmissionId(result.submissionId);
    return result;
  }

  /** Photos need a submission to hang off: save the draft first if it does not exist yet. */
  async function ensureSaved() {
    return (await persist())?.submissionId ?? null;
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      if ((await persist()) !== null) toast.success("Borrador guardado");
    });

  const next = () =>
    run(async () => {
      if ((await persist()) !== null) setPosition((p) => p + 1);
    });

  const submit = () =>
    run(async () => {
      const saved = await persist();
      if (saved === null) return;

      const result = await submitCedula(unitId, saved.version);
      if (!result.ok) {
        toast.error(result.error);
        if (result.issues?.length) {
          setIssues(result.issues);
          const target = visible.indexOf(result.issues[0].step);
          if (target >= 0) setPosition(target);
        }
        return;
      }
      toast.success("Cédula enviada");
      router.replace("/campo");
      router.refresh();
    });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{folio}</p>
            <h1 className="truncate text-lg font-semibold">{values.name || "Unidad sin nombre"}</h1>
          </div>
          <Badge variant={status === "APPROVED" ? "default" : "secondary"}>{STATUS_LABELS[status]}</Badge>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Paso {position + 1} de {visible.length} · {STEPS[step].key}. {STEPS[step].title}
          </p>
          <Progress value={((position + 1) / visible.length) * 100} />
        </div>
        {readOnly && (
          <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            Esta cédula está en modo lectura.
          </p>
        )}
      </div>

      <fieldset disabled={readOnly || busy} className="flex flex-1 flex-col gap-5 px-4 pb-4">
        {issues.length > 0 && (
          <div role="alert" className="rounded-md border border-destructive/50 p-3 text-sm">
            <p className="mb-1 font-medium text-destructive">Faltan datos para enviar:</p>
            <ul className="list-disc pl-5">
              {issues.map((issue) => (
                <li key={issue.message}>
                  <button
                    type="button"
                    className="text-left underline"
                    onClick={() => setPosition(Math.max(visible.indexOf(issue.step), 0))}
                  >
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 0 && <SectionA values={values} set={set} folio={folio} visitedAt={visitedAt} responsible={responsible} />}
        {step === 1 && <SectionB values={values} set={set} />}
        {step === 2 && <SectionC values={values} set={set} />}
        {step === 3 && <SectionD values={values} set={set} />}
        {step === 4 && (
          <SectionE
            values={values}
            set={set}
            photos={
              <Photos
                unitId={unitId}
                submissionId={submissionId}
                photos={photos}
                minPhotos={minPhotos}
                required={values.located !== false}
                disabled={readOnly || busy}
                ensureSaved={ensureSaved}
                onAdd={(id) => setPhotos((current) => [...current, { id }])}
                onRemove={(id) => setPhotos((current) => current.filter((p) => p.id !== id))}
              />
            }
          />
        )}
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t bg-background p-4">
          <Button variant="outline" disabled={busy || position === 0} onClick={() => setPosition((p) => p - 1)}>
            Atrás
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={save}>
              {busy ? "Guardando…" : "Guardar"}
            </Button>
            {isLast ? (
              <Button disabled={busy} onClick={submit}>
                Enviar
              </Button>
            ) : (
              <Button disabled={busy} onClick={next}>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

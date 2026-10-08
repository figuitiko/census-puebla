"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EQUIPMENT_LABELS,
  GREEN_CONDITION_LABELS,
  GREEN_TYPE_LABELS,
  GREEN_USE_LABELS,
  ORG_FIGURE_LABELS,
  PRIVATE_UNIT_LABELS,
  SOURCE_LABELS,
} from "@/lib/catalogs";
import { privateUnitsKnownSum, privateUnitsTotal, PRIVATE_UNIT_TYPES, type CedulaValues } from "../schema";
import {
  ChoiceField,
  CountField,
  DecimalField,
  Field,
  MultiField,
  TextField,
  TriStateField,
  YesNoField,
} from "./fields";

export type SectionProps = {
  values: CedulaValues;
  set: <K extends keyof CedulaValues>(key: K, value: CedulaValues[K]) => void;
};

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">{children}</p>;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <Input value={value} readOnly disabled className="h-11" />
    </Field>
  );
}

export function SectionA({
  values,
  set,
  folio,
  visitedAt,
  responsible,
}: SectionProps & { folio: string; visitedAt: string | null; responsible: string }) {
  return (
    <div className="flex flex-col gap-5">
      <ReadOnlyField label="1. Folio" value={folio} />
      <ReadOnlyField
        label="2. Fecha y hora"
        value={visitedAt ? new Date(visitedAt).toLocaleString("es-MX") : "Se registra al guardar por primera vez"}
      />
      <ReadOnlyField label="3. Persona responsable" value={responsible} />

      <div className="grid grid-cols-2 gap-4">
        <DecimalField
          label="4. Latitud"
          placeholder="19.0414"
          value={values.lat}
          onChange={(v) => set("lat", v)}
        />
        <DecimalField
          label="4. Longitud"
          placeholder="-98.2063"
          value={values.lng}
          onChange={(v) => set("lng", v)}
        />
      </div>
      <TextField label="5. Nombre de la UH" value={values.name} maxLength={200} onChange={(v) => set("name", v)} />
      <TextField label="6. Junta auxiliar" value={values.juntaAuxiliar} maxLength={120} onChange={(v) => set("juntaAuxiliar", v)} />
      <TextField label="7. Colonia" value={values.colonia} maxLength={120} onChange={(v) => set("colonia", v)} />
      <TextField label="8. Domicilio o referencia" value={values.address} maxLength={300} onChange={(v) => set("address", v)} />

      <YesNoField
        label="9. ¿La unidad habitacional fue localizada?"
        value={values.located}
        onChange={(v) => set("located", v)}
      />
      {values.located === false && (
        <Note>
          Si la respuesta es «No», registrá la incidencia y finalizá la cédula: solo se piden esta sección y las
          observaciones. Las respuestas de las secciones B a E se descartan al guardar.
        </Note>
      )}
    </div>
  );
}

export function SectionB({ values, set }: SectionProps) {
  const total = privateUnitsTotal(values);
  const known = privateUnitsKnownSum(values);

  return (
    <div className="flex flex-col gap-5">
      <CountField
        label="10. Total de viviendas"
        hint="Dejalo vacío si no se sabe."
        value={values.dwellings}
        onChange={(v) => set("dwellings", v)}
      />
      <TriStateField
        label="11. ¿Existen otras unidades privativas?"
        value={values.otherUnits}
        onChange={(v) => set("otherUnits", v)}
      />

      {values.otherUnits === "YES" && (
        <div className="flex flex-col gap-4 rounded-md border p-4">
          <p className="text-sm font-medium">12. Tipo de unidad privativa</p>
          <p className="text-xs text-muted-foreground">No incluyas viviendas. Vacío = sin dato, 0 = ninguna.</p>
          {PRIVATE_UNIT_TYPES.map((type) => (
            <CountField
              key={type}
              label={PRIVATE_UNIT_LABELS[type]}
              value={values.privateUnits[type]}
              onChange={(v) => set("privateUnits", { ...values.privateUnits, [type]: v })}
            />
          ))}
          <TextField
            label="Especificá «Otros»"
            value={values.privateOtherLabel}
            maxLength={120}
            onChange={(v) => set("privateOtherLabel", v)}
          />
          <p className="text-sm">
            Total: <span className="font-semibold">{total ?? `${known}+ (parcial)`}</span>
          </p>
        </div>
      )}
      {values.otherUnits === "NO" && <Note>Total de unidades privativas: 0.</Note>}
    </div>
  );
}

export function SectionC({ values, set }: SectionProps) {
  return (
    <div className="flex flex-col gap-5">
      <TriStateField
        label="13. ¿Existen áreas verdes?"
        value={values.greenAreas}
        onChange={(v) => set("greenAreas", v)}
      />

      {values.greenAreas === "YES" && (
        <>
          <CountField label="14. Número de áreas verdes" value={values.greenAreaCount} onChange={(v) => set("greenAreaCount", v)} />
          <ChoiceField label="15. Tipo predominante" options={GREEN_TYPE_LABELS} value={values.greenType} onChange={(v) => set("greenType", v)} />
          <ChoiceField label="16. Uso principal" options={GREEN_USE_LABELS} value={values.greenUse} onChange={(v) => set("greenUse", v)} />
          <MultiField
            label="17. Equipamiento"
            hint="Podés marcar varios. «Ninguno» excluye al resto."
            options={EQUIPMENT_LABELS}
            values={values.equipment}
            exclusive="NINGUNO"
            onChange={(v) => set("equipment", v)}
          />
          <ChoiceField
            label="18. Condición general"
            options={GREEN_CONDITION_LABELS}
            value={values.greenCondition}
            onChange={(v) => set("greenCondition", v)}
          />
        </>
      )}
      {values.greenAreas === "NO" && <Note>Sin áreas verdes: se omiten los campos 14 a 18.</Note>}
      {values.greenAreas === "UNDETERMINED" && (
        <Note>Sin poder determinarlo, no se describen las áreas verdes (campos 14 a 18).</Note>
      )}
    </div>
  );
}

export function SectionD({ values, set }: SectionProps) {
  return (
    <div className="flex flex-col gap-5">
      <TriStateField
        label="19. ¿Se identifica una figura de administración?"
        value={values.orgIdentified}
        onChange={(v) => set("orgIdentified", v)}
      />

      {values.orgIdentified === "YES" && (
        <>
          <MultiField
            label="20. Figura(s) identificada(s)"
            options={ORG_FIGURE_LABELS}
            values={values.orgFigures}
            onChange={(v) => set("orgFigures", v)}
          />
          <Field label="21. Características / observaciones">
            <Textarea
              value={values.orgNotes}
              maxLength={1000}
              rows={4}
              onChange={(event) => set("orgNotes", event.target.value)}
            />
          </Field>
        </>
      )}
      {values.orgIdentified !== null && values.orgIdentified !== "YES" && (
        <Note>Se omiten los campos 20 y 21.</Note>
      )}
    </div>
  );
}

export function SectionE({ values, set, photos }: SectionProps & { photos: React.ReactNode }) {
  const located = values.located !== false;

  return (
    <div className="flex flex-col gap-5">
      {located && (
        <>
          <ChoiceField
            label="22. Fuente principal de la información"
            options={SOURCE_LABELS}
            value={values.source}
            onChange={(v) => set("source", v)}
          />
          <YesNoField
            label="23. ¿Existe evidencia documental?"
            value={values.hasDocEvidence}
            onChange={(v) => set("hasDocEvidence", v)}
          />
          {values.hasDocEvidence === true && (
            <TextField
              label="24. Tipo de documento"
              hint="Especificá cuál."
              value={values.docType}
              maxLength={200}
              onChange={(v) => set("docType", v)}
            />
          )}
        </>
      )}
      {photos}
      <Field
        label="26. Observaciones o incidencias"
        hint={values.located === false ? "Obligatorio: registrá por qué no se localizó." : undefined}
      >
        <Textarea
          value={values.observations}
          maxLength={2000}
          rows={5}
          onChange={(event) => set("observations", event.target.value)}
        />
      </Field>
    </div>
  );
}

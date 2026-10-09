"use client";

import { useId, useState, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TRISTATE_LABELS } from "@/lib/catalogs";
import { parseDecimal, sanitizeDecimal } from "@/lib/decimal-input";
import type { TriState } from "@/lib/generated/prisma/enums";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

const OPTION_CLASS =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent";

type ChoiceProps<T extends string> = {
  label: string;
  hint?: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
};

/** Single choice from a catalog. */
export function ChoiceField<T extends string>({ label, hint, options, value, onChange }: ChoiceProps<T>) {
  const id = useId();
  return (
    <Field label={label} hint={hint}>
      <RadioGroup value={value ?? ""} onValueChange={(next) => onChange(next as T)} className="gap-2">
        {(Object.keys(options) as T[]).map((key) => (
          <label key={key} htmlFor={`${id}-${key}`} className={OPTION_CLASS}>
            <RadioGroupItem id={`${id}-${key}`} value={key} />
            {options[key]}
          </label>
        ))}
      </RadioGroup>
    </Field>
  );
}

export function TriStateField(props: {
  label: string;
  hint?: string;
  value: TriState | null;
  onChange: (value: TriState) => void;
}) {
  return <ChoiceField<TriState> {...props} options={TRISTATE_LABELS} />;
}

/** Plain Si / No (fields 9 and 23: the workbook allows no third option). */
export function YesNoField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <ChoiceField<"YES" | "NO">
      label={label}
      hint={hint}
      options={{ YES: "Sí", NO: "No" }}
      value={value === null ? null : value ? "YES" : "NO"}
      onChange={(next) => onChange(next === "YES")}
    />
  );
}

type MultiProps<T extends string> = {
  label: string;
  hint?: string;
  options: Record<T, string>;
  values: T[];
  onChange: (values: T[]) => void;
};

/** Multi-select. `exclusive` is a key that clears every other choice (e.g. "Ninguno"). */
export function MultiField<T extends string>({
  label,
  hint,
  options,
  values,
  onChange,
  exclusive,
}: MultiProps<T> & { exclusive?: T }) {
  const id = useId();

  function toggle(key: T, checked: boolean) {
    if (!checked) return onChange(values.filter((v) => v !== key));
    if (key === exclusive) return onChange([key]);
    onChange([...values.filter((v) => v !== exclusive), key]);
  }

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-col gap-2">
        {(Object.keys(options) as T[]).map((key) => (
          <label key={key} htmlFor={`${id}-${key}`} className={OPTION_CLASS}>
            <Checkbox
              id={`${id}-${key}`}
              checked={values.includes(key)}
              onCheckedChange={(checked) => toggle(key, checked === true)}
            />
            {options[key]}
          </label>
        ))}
      </div>
    </Field>
  );
}

/** Integer input. Empty means "sin dato" (null), 0 is a confirmed zero. */
export function CountField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        placeholder="Sin dato"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        className="h-11"
      />
    </Field>
  );
}

export function DecimalField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  // The raw text is the source of truth while typing; `value` only wins when it changes from outside
  // (e.g. the pasted "lat, lng" field), detected by the parsed text no longer matching it.
  const [text, setText] = useState(value === null ? "" : String(value));
  if (parseDecimal(text) !== value) setText(value === null ? "" : String(value));

  return (
    <Field label={label} hint={hint}>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          const next = sanitizeDecimal(event.target.value);
          if (next === null) return;
          setText(next);
          onChange(parseDecimal(next));
        }}
        className="h-11"
      />
    </Field>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="h-11" />
    </Field>
  );
}

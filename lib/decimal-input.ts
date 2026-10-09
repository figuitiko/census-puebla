/**
 * Helpers for a decimal <input type="text">. A controlled type="number" input fed a JS number
 * deletes a trailing "." while typing ("-98." -> -98), so "-98.22" arrives as "-9822".
 * Keeping the raw text as the source of truth avoids that.
 */

/** Allows partial input while typing ("-", "-98.", ".5"). Accepts "," as the decimal mark. Null = reject keystroke. */
export function sanitizeDecimal(raw: string): string | null {
  const text = raw.replace(",", ".");
  return /^-?\d*\.?\d*$/.test(text) ? text : null;
}

/** Number for a finished value, null for empty or still-incomplete text ("", "-", ".", "-."). */
export function parseDecimal(text: string): number | null {
  if (text === "" || text === "-" || text === "." || text === "-.") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

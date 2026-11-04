/** Photos required per unit by the real survey (cedula field 25). */
export const CONTRACT_MIN_PHOTOS = 10;

/** Photos allowed per unit by the real survey (cedula field 25). */
export const CONTRACT_MAX_PHOTOS = 20;

/** Used when MAX_PHOTOS is not set: the contract limit, so a missing env var can never loosen the cap. */
const DEFAULT_MAX_PHOTOS = CONTRACT_MAX_PHOTOS;

/** Used when MIN_PHOTOS is not set: the contract minimum, so a missing env var can never weaken the gate. */
const DEFAULT_MIN_PHOTOS = CONTRACT_MIN_PHOTOS;

/**
 * Minimum confirmed photos per unit, from the MIN_PHOTOS env var (server-side, read on every call so
 * a restart is all a change needs). Unset or blank -> DEFAULT_MIN_PHOTOS (the contract value). A malformed value
 * throws on purpose: silently falling back would quietly weaken the photo gate. Lower it only for local testing.
 */
export function getMinPhotos(): number {
  const raw = process.env.MIN_PHOTOS?.trim();
  if (!raw) return DEFAULT_MIN_PHOTOS;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`MIN_PHOTOS must be a non-negative integer, got "${raw}"`);
  }
  return value;
}

/**
 * Maximum confirmed photos per unit, from the MAX_PHOTOS env var (server-side). Unset or blank ->
 * DEFAULT_MAX_PHOTOS (the contract value). A malformed value
 * throws on purpose, and so does one below the minimum, which would make the cedula impossible to submit.
 */
export function getMaxPhotos(): number {
  const raw = process.env.MAX_PHOTOS?.trim();
  if (!raw) return Math.max(DEFAULT_MAX_PHOTOS, getMinPhotos());

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`MAX_PHOTOS must be a positive integer, got "${raw}"`);
  }
  if (value < getMinPhotos()) {
    throw new Error(`MAX_PHOTOS (${value}) cannot be lower than MIN_PHOTOS (${getMinPhotos()})`);
  }
  return value;
}

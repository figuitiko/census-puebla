/** Photos required per located unit by the real survey (cedula field 25). */
export const CONTRACT_MIN_PHOTOS = 10;

/** Used when MIN_PHOTOS is not set: deliberately lenient so local testing needs one photo. */
const DEFAULT_MIN_PHOTOS = 1;

/**
 * Minimum confirmed photos for a located unit, from the MIN_PHOTOS env var (server-side, read on every call so
 * a restart is all a change needs). Unset or blank -> DEFAULT_MIN_PHOTOS. A malformed value throws on purpose:
 * silently falling back would quietly weaken the photo gate. Set MIN_PHOTOS=10 for real data.
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

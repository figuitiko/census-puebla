import { prisma } from "@/lib/prisma";

/** MVP runs a single campaign: the most recent one. */
export function getCampaign() {
  return prisma.campaign.findFirst({ orderBy: { createdAt: "desc" } });
}

/** "YYYY-MM-DD" from an <input type="date"> -> Date at UTC midnight (matches @db.Date). Null if invalid. */
export function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

import type { NextRequest } from "next/server";
import { parseFilters } from "@/features/dashboard/filters";
import { getCampaignRows } from "@/features/dashboard/queries";
import { applyFilters } from "@/features/dashboard/rows";
import { authorizeReports, safeFilename } from "@/features/reports/authorize";
import { buildRegistryWorkbook } from "@/features/reports/xlsx";

export const runtime = "nodejs"; // exceljs needs Node APIs

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Registry workbook for the dashboard's current filters (same `parseFilters` + `applyFilters` as the page). */
export async function GET(request: NextRequest) {
  const { user, denied } = await authorizeReports();
  if (!user) return denied;

  const data = await getCampaignRows();
  if (!data) return new Response("Sin campaña configurada", { status: 404 });

  const filters = parseFilters(Object.fromEntries(request.nextUrl.searchParams));
  const rows = applyFilters(data.rows, filters);

  const file = await buildRegistryWorkbook(rows, data.campaign.name);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${safeFilename(`registro_${data.campaign.name}_${stamp}`)}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}

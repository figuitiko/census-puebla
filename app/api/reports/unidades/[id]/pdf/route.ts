import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { authorizeReports, safeFilename } from "@/features/reports/authorize";
import { getDossier } from "@/features/reports/dossier";
import { DossierPdf } from "@/features/reports/dossier-pdf";
import { getMinPhotos } from "@/lib/campaign-rules";

export const runtime = "nodejs"; // react-pdf needs Node APIs

/** On-demand PDF dossier of one unit. Session + role checked on every request; never cached. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/reports/unidades/[id]/pdf">) {
  const { user, denied } = await authorizeReports();
  if (!user) return denied;

  const { id } = await ctx.params;
  const dossier = await getDossier(id);
  if (!dossier) return new Response("No encontrado", { status: 404 });

  // Called as a function (not createElement): renderToBuffer is typed to take the <Document> element itself.
  const file = await renderToBuffer(DossierPdf({ dossier, minPhotos: getMinPhotos() }));

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(`expediente_${dossier.capture.folio}`)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

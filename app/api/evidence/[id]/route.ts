import { get } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { getUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Streams a private photo after a per-request permission check. Never cached by a CDN. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/evidence/[id]">) {
  const user = await getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { id } = await ctx.params;
  const evidence = await prisma.evidence.findUnique({
    where: { id },
    select: {
      pathname: true,
      status: true,
      submission: { select: { unit: { select: { assignedToId: true } } } },
    },
  });
  if (!evidence || evidence.status !== "CONFIRMED") return new Response("No encontrado", { status: 404 });

  if (!can(user, "evidence:read", { assigneeId: evidence.submission.unit.assignedToId })) {
    return new Response("Sin permiso", { status: 403 });
  }

  const blob = await get(evidence.pathname, { access: "private" });
  if (!blob || blob.statusCode !== 200) return new Response("No encontrado", { status: 404 });

  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

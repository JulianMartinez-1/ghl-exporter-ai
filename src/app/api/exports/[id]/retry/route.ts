import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runExport } from "@/modules/export/run-export";

const bodySchema = z.object({
  rawHtml: z.string().trim().min(100, "Pega el HTML completo de la página."),
});

/**
 * Retries a failed export. If the automatic crawl couldn't get the page (e.g.
 * blocked by Cloudflare), the user can paste the page's HTML by hand instead.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const exportRecord = await prisma.export.findUnique({ where: { id } });
  if (!exportRecord) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
  }

  await prisma.export.update({
    where: { id },
    data: {
      status: "PENDING",
      progress: 0,
      rawHtml: parsed.data.rawHtml,
      errorMessage: null,
    },
  });

  after(() => runExport({ exportId: id, url: exportRecord.url, rawHtml: parsed.data.rawHtml }));

  return NextResponse.json({ success: true });
}

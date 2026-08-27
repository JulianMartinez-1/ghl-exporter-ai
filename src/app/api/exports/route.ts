import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { runExport } from "@/modules/export/run-export";

const bodySchema = z.object({
  url: z.string().trim().min(1, "Pega el link de tu sitio o funnel de GoHighLevel."),
  rawHtml: z.string().optional(),
});

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function projectNameFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const host = slugify(u.hostname.replace(/^www\./, ""));
    return `ghl-${host || "sitio"}`;
  } catch {
    return `ghl-sitio-${Date.now()}`;
  }
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "invalid_body", message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  let url: string;
  try {
    url = normalizeUrl(parsed.data.url);
    new URL(url); // throws if still invalid
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_url", message: "La URL no es válida." },
      { status: 400 }
    );
  }

  const exportRecord = await prisma.export.create({
    data: {
      url,
      name: projectNameFromUrl(url),
      rawHtml: parsed.data.rawHtml?.trim() || null,
      status: "PENDING",
    },
  });

  // Kick off the pipeline after the response is sent — no queue, no worker process.
  after(() => runExport({ exportId: exportRecord.id, url, rawHtml: parsed.data.rawHtml }));

  return NextResponse.json({ success: true, data: { id: exportRecord.id } }, { status: 201 });
}

export async function GET() {
  const exports = await prisma.export.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ success: true, data: exports });
}

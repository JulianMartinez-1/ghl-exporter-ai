import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const exportRecord = await prisma.export.findUnique({
    where: { id },
    include: { logs: { orderBy: { createdAt: "asc" } } },
  });

  if (!exportRecord) {
    return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: exportRecord });
}

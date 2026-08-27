import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const exportRecord = await prisma.export.findUnique({ where: { id } });
  if (!exportRecord?.zipPath) {
    return NextResponse.json(
      { success: false, error: "not_found", message: "No hay un ZIP disponible para esta exportación." },
      { status: 404 }
    );
  }

  try {
    const buffer = await fs.readFile(exportRecord.zipPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${exportRecord.name}.zip"`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "file_missing", message: "El archivo ZIP ya no está disponible en el servidor." },
      { status: 404 }
    );
  }
}

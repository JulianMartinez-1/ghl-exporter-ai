import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GhlApiClient, GhlLocationsService } from "@/modules/gohighlevel";
import { encrypt } from "@/lib/utils";

export async function POST() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pit = process.env.GHL_PRIVATE_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!pit || pit.startsWith("REEMPLAZAR")) {
      return NextResponse.json({ error: "GHL_PRIVATE_TOKEN no configurado en .env.local" }, { status: 400 });
    }
    if (!locationId || locationId.startsWith("REEMPLAZAR")) {
      return NextResponse.json({ error: "GHL_LOCATION_ID no configurado en .env.local" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado en la base de datos" }, { status: 404 });

    // Intentar obtener info de la location (opcional — falla si el PIT no tiene locations.readonly)
    let locationName = `Location ${locationId}`;
    let companyId: string | null = null;
    try {
      const client = new GhlApiClient(pit, locationId);
      const locService = new GhlLocationsService(client);
      const location = await locService.getLocation(locationId);
      locationName = location.name;
      companyId = location.companyId ?? null;
    } catch {
      // Si falla, continuar con el nombre por defecto — el PIT puede no tener locations.readonly
    }

    // PITs no expiran — expiresAt en 100 anos para que nunca se intente refresh
    const expiresAt = new Date("2124-01-01T00:00:00.000Z");
    const encryptedToken = encrypt(pit);

    const connection = await prisma.ghlConnection.upsert({
      where: { userId_locationId: { userId: user.id, locationId } },
      create: {
        userId: user.id,
        locationId,
        locationName,
        accessToken: encryptedToken,
        refreshToken: encryptedToken,
        expiresAt,
        scopes: ["funnels.readonly", "websites.readonly", "medias.readonly", "medias.write", "locations.readonly"],
        companyId,
        userType: "Location",
        approvedLocations: [locationId],
      },
      update: {
        locationName,
        accessToken: encryptedToken,
        refreshToken: encryptedToken,
        expiresAt,
        companyId,
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      locationName,
      locationId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    console.error("[private-connect]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

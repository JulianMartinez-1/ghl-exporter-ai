import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GhlApiClient, GhlWebsitesService, GhlOAuthService } from "@/modules/gohighlevel";
import { decrypt, encrypt } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locationId = req.nextUrl.searchParams.get("locationId");
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!locationId || !projectId) {
    return NextResponse.json({ error: "Missing locationId or projectId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const conn = await prisma.ghlConnection.findFirst({
    where: { userId: user.id, locationId },
  });

  if (!conn) {
    return NextResponse.json(
      {
        success: false,
        error: "no_connection",
        message: `No tienes una cuenta GHL conectada para la ubicación ${locationId}. Conéctala primero desde el Dashboard.`,
      },
      { status: 404 }
    );
  }

  const oauthService = new GhlOAuthService();
  let accessToken = decrypt(conn.accessToken);

  if (oauthService.isTokenExpired(conn.expiresAt)) {
    try {
      const tokens = await oauthService.refreshToken(decrypt(conn.refreshToken));
      accessToken = tokens.access_token;
      await prisma.ghlConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "token_refresh_failed", message: "El token de GHL expiró y no pudo renovarse. Vuelve a conectar la cuenta." },
        { status: 401 }
      );
    }
  }

  try {
    const client = new GhlApiClient(accessToken, locationId);
    const svc = new GhlWebsitesService(client);

    // Try standard funnels/websites list first
    const allSites = await svc.listWebsites(locationId);
    let source = allSites.find((s) => s.id === projectId);
    let pages = source ? await svc.getWebsitePages(projectId, locationId) : [];

    // Vibe/AI Studio project IDs don't appear in /funnels/funnel/list.
    // Fall back to fetching pages directly — GHL uses the same /funnels/page
    // endpoint regardless of project type.
    if (!source) {
      interface RawPage {
        id: string;
        locationId: string;
        funnelId: string;
        name: string;
        url?: string;
        path?: string;
        title?: string;
        description?: string;
        og?: { title?: string; description?: string; image?: string };
        builderVersion?: string;
        createdAt: string;
        updatedAt: string;
      }
      interface PageListResponse { pages?: RawPage[] }

      const raw = await client
        .get<PageListResponse>("/funnels/page", { funnelId: projectId, locationId, limit: 100, skip: 0 })
        .catch(() => ({ pages: [] as RawPage[] }));

      const rawPages = raw.pages ?? [];
      if (rawPages.length > 0) {
        source = { id: projectId, locationId, name: `Proyecto ${projectId}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        pages = rawPages.map((p) => ({
          id: p.id,
          locationId: p.locationId,
          websiteId: p.funnelId,
          name: p.name,
          url: p.url,
          previewUrl: p.url,
          path: p.path,
          title: p.title,
          description: p.description,
          og: p.og,
          builderVersion: p.builderVersion,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
      }
    }

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: "not_found",
          message: `No se encontró el proyecto "${projectId}" en esta subcuenta. Si el proyecto es de otra subcuenta, conéctala desde el Dashboard. Si el proyecto es Vibe/IA, usa la URL de vista previa (vibepreview.com) directamente.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { source, pages, connectionId: conn.id },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al consultar la API de GHL";
    return NextResponse.json({ success: false, error: "api_error", message: msg }, { status: 500 });
  }
}

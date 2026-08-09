import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GhlApiClient, GhlWebsitesService, GhlOAuthService } from "@/modules/gohighlevel";
import { decrypt, encrypt } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });

  const conn = await prisma.ghlConnection.findFirst({
    where: { id: connectionId, user: { clerkId } },
  });
  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const oauthService = new GhlOAuthService();
  let accessToken = decrypt(conn.accessToken);

  if (oauthService.isTokenExpired(conn.expiresAt)) {
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
  }

  try {
    const client = new GhlApiClient(accessToken, conn.locationId);
    const svc = new GhlWebsitesService(client);
    const websites = await svc.listWebsites(conn.locationId);
    return NextResponse.json({ success: true, data: websites });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch websites";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

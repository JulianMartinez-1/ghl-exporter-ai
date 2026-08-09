import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GhlApiClient, GhlLocationsService, GhlOAuthService } from "@/modules/gohighlevel";
import { decrypt, encrypt } from "@/lib/utils";

export async function GET() {
  try {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const connections = await prisma.ghlConnection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const oauthService = new GhlOAuthService();
  const locations = await Promise.all(
    connections.map(async (conn) => {
      let accessToken = decrypt(conn.accessToken);

      // Auto-refresh if expired
      if (oauthService.isTokenExpired(conn.expiresAt)) {
        try {
          const tokens = await oauthService.refreshToken(decrypt(conn.refreshToken));
          accessToken = tokens.access_token;
          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
          await prisma.ghlConnection.update({
            where: { id: conn.id },
            data: {
              accessToken: encrypt(tokens.access_token),
              refreshToken: encrypt(tokens.refresh_token),
              expiresAt,
            },
          });
        } catch {
          return null;
        }
      }

      const client = new GhlApiClient(accessToken, conn.locationId);
      const svc = new GhlLocationsService(client);
      try {
        const location = await svc.getLocation(conn.locationId);
        return { ...location, connectionId: conn.id };
      } catch {
        return null;
      }
    })
  );

  return NextResponse.json({
    success: true,
    data: locations.filter(Boolean),
  });
  } catch (err) {
    console.error("[GET /api/ghl/locations]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

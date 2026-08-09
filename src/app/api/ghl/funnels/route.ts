import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GhlApiClient, GhlFunnelsService, GhlOAuthService } from "@/modules/gohighlevel";
import { decrypt, encrypt } from "@/lib/utils";

async function getValidClient(connectionId: string, userId: string) {
  const conn = await prisma.ghlConnection.findFirst({
    where: { id: connectionId, user: { clerkId: userId } },
  });
  if (!conn) throw new Error("Connection not found");

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

  return { client: new GhlApiClient(accessToken, conn.locationId), conn };
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });

  try {
    const { client, conn } = await getValidClient(connectionId, clerkId);
    const svc = new GhlFunnelsService(client);
    const funnels = await svc.listFunnels(conn.locationId);
    return NextResponse.json({ success: true, data: funnels });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch funnels";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { GhlOAuthService } from "@/modules/gohighlevel";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ghl/oauth — generate authorization URL
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const popup = req.nextUrl.searchParams.get("popup") === "1";
  const oauthService = new GhlOAuthService();
  // Embed popup flag in state so callback knows how to redirect
  const state = `${userId}:${randomUUID()}${popup ? ":popup" : ""}`;
  const url = oauthService.buildAuthorizationUrl(state);

  return NextResponse.json({ url });
}

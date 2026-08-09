import { NextRequest, NextResponse } from "next/server";
import { GhlOAuthService, GhlLocationsService, GhlApiClient } from "@/modules/gohighlevel";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Parse popup flag from state before anything else
  const parts = state?.split(":") ?? [];
  const clerkId = parts[0] ?? "";
  const isPopup = parts[2] === "popup";

  const fail = (msg: string) =>
    NextResponse.redirect(
      isPopup
        ? `${appUrl}/ghl-connect/error?error=${encodeURIComponent(msg)}`
        : `${appUrl}/dashboard?ghl_error=${encodeURIComponent(msg)}`
    );

  const success = () =>
    NextResponse.redirect(
      isPopup ? `${appUrl}/ghl-connect/success` : `${appUrl}/dashboard?ghl_connected=true`
    );

  if (error) return fail(error);
  if (!code || !state) return fail("missing_params");
  if (!clerkId) return fail("invalid_state");

  const oauthService = new GhlOAuthService();

  try {
    const tokens = await oauthService.exchangeCode(code);

    const locationId = tokens.locationId ?? "";
    if (!locationId) return fail("no_location");

    const client = new GhlApiClient(tokens.access_token, locationId);
    const locService = new GhlLocationsService(client);

    let locationName = locationId;
    try {
      const location = await locService.getLocation(locationId);
      locationName = location.name;
    } catch {
      // locations.readonly not granted; use locationId as display name
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return fail("user_not_found");

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.ghlConnection.upsert({
      where: { userId_locationId: { userId: user.id, locationId } },
      create: {
        userId: user.id,
        locationId,
        locationName,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt,
        scopes: tokens.scope.split(" "),
        companyId: tokens.companyId,
      },
      update: {
        locationName,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt,
        scopes: tokens.scope.split(" "),
        companyId: tokens.companyId,
      },
    });

    return success();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth failed";
    return fail(msg);
  }
}

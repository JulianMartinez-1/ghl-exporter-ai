import { NextRequest, NextResponse } from "next/server";
import { GhlOAuthService, GhlLocationsService, GhlApiClient } from "@/modules/gohighlevel";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

    const isAgency = tokens.userType === "Company";
    const companyId = tokens.companyId ?? "";

    // Agency token: locationId will be empty — use companyId as the connection key
    const locationId = isAgency
      ? `company_${companyId}`
      : (tokens.locationId ?? "");

    if (!locationId) return fail("no_location");

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return fail("user_not_found");

    const client = new GhlApiClient(tokens.access_token, locationId);
    const locService = new GhlLocationsService(client);

    let locationName = isAgency ? `Agency: ${companyId}` : locationId;
    if (!isAgency) {
      try {
        const location = await locService.getLocation(locationId);
        locationName = location.name;
      } catch {
        // scope not granted or agency token; keep fallback name
      }
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const approvedLocations = tokens.approvedLocations ?? [];

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
        companyId: companyId || null,
        userType: tokens.userType ?? "Location",
        approvedLocations,
      },
      update: {
        locationName,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt,
        scopes: tokens.scope.split(" "),
        companyId: companyId || null,
        userType: tokens.userType ?? "Location",
        approvedLocations,
      },
    });

    return success();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth failed";
    return fail(msg);
  }
}

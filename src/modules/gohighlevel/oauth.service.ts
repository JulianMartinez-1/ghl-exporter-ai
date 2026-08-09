import { GHL_OAUTH_BASE, GHL_API_BASE } from "./client";
import type { GhlTokenResponse } from "./types";

const SCOPES = [
  "funnels.readonly",
  "websites.readonly",
  "medias.readonly",
  "medias.write",
  "locations.readonly",
].join(" ");

export class GhlOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GHL_CLIENT_ID ?? "";
    this.clientSecret = process.env.GHL_CLIENT_SECRET ?? "";
    this.redirectUri = process.env.GHL_REDIRECT_URI ?? "";
  }

  buildAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      scope: SCOPES,
      state,
    });
    return `${GHL_OAUTH_BASE}/oauth/chooselocation?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GhlTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      user_type: "Company",
    });

    const res = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OAuth token exchange failed: ${err}`);
    }

    return res.json() as Promise<GhlTokenResponse>;
  }

  async refreshToken(refreshToken: string): Promise<GhlTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      user_type: "Company",
    });

    const res = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OAuth token refresh failed: ${err}`);
    }

    return res.json() as Promise<GhlTokenResponse>;
  }

  isTokenExpired(expiresAt: Date): boolean {
    return new Date() >= new Date(expiresAt.getTime() - 5 * 60 * 1000);
  }
}

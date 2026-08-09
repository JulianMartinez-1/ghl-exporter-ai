import type { GhlApiError } from "./types";

export const GHL_API_BASE = "https://services.leadconnectorhq.com";
export const GHL_OAUTH_BASE = "https://marketplace.gohighlevel.com";
export const GHL_API_VERSION = "2021-07-28";

export class GhlApiClient {
  private accessToken: string;
  private locationId: string;

  constructor(accessToken: string, locationId: string) {
    this.accessToken = accessToken;
    this.locationId = locationId;
  }

  private buildHeaders(version?: string): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      Version: version ?? GHL_API_VERSION,
    };
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean>, version?: string): Promise<T> {
    const url = new URL(`${GHL_API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: this.buildHeaders(version),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as Partial<GhlApiError>;
      throw new GhlClientError(
        err.message ?? `GHL API error: ${res.status}`,
        res.status,
        err.error
      );
    }

    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown, version?: string): Promise<T> {
    const res = await fetch(`${GHL_API_BASE}${path}`, {
      method: "POST",
      headers: this.buildHeaders(version),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as Partial<GhlApiError>;
      throw new GhlClientError(
        err.message ?? `GHL API error: ${res.status}`,
        res.status,
        err.error
      );
    }

    return res.json() as Promise<T>;
  }

  getLocationId(): string {
    return this.locationId;
  }
}

export class GhlClientError extends Error {
  statusCode: number;
  errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.name = "GhlClientError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

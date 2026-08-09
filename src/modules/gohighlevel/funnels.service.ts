import { GhlApiClient } from "./client";
import type { GhlFunnel, GhlPage } from "@/types";

interface FunnelListResponse {
  funnels: Array<{
    _id: string;
    locationId: string;
    name: string;
    type?: string;
    url?: string;
    domain?: string;
    faviconUrl?: string;
    dateAdded: string;
    dateUpdated: string;
  }>;
  count: number;
  total: number;
}

interface FunnelPageListResponse {
  pages: Array<{
    id: string;
    locationId: string;
    funnelId: string;
    name: string;
    stepId?: string;
    sequenceIndex?: number;
    url?: string;
    path?: string;
    title?: string;
    description?: string;
    keywords?: string;
    customHeadCode?: string;
    customBodyCode?: string;
    pixels?: string;
    og?: { title?: string; description?: string; image?: string; url?: string };
    builderVersion?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total?: number;
}

export class GhlFunnelsService {
  constructor(private client: GhlApiClient) {}

  private resolvePageUrl(sourceUrl: string | undefined, sourceDomain: string | undefined, pageUrl: string | undefined, pagePath: string | undefined): string | undefined {
    // Validate pageUrl has a real domain (not a bare word like "soybeya")
    if (pageUrl) {
      try {
        const u = new URL(pageUrl.startsWith("http") ? pageUrl : `https://${pageUrl}`);
        if (u.hostname.includes(".")) return pageUrl;
      } catch { /* fall through */ }
    }

    const base = sourceUrl ?? sourceDomain;
    if (!base || !pagePath) return undefined;

    try {
      const normalizedBase = base.startsWith("http") ? base : `https://${base}`;
      const parsedBase = new URL(normalizedBase);
      // Reject base URLs without a real domain (e.g. GHL internal site name "soybeya")
      if (!parsedBase.hostname.includes(".")) return undefined;
      return new URL(pagePath, normalizedBase).toString();
    } catch {
      return undefined;
    }
  }

  // Official endpoint: GET /funnels/funnel/list
  async listFunnels(locationId: string): Promise<GhlFunnel[]> {
    const response = await this.client.get<FunnelListResponse>(
      "/funnels/funnel/list",
      { locationId, limit: 100, skip: 0, type: "funnel" }
    );

    return (response.funnels ?? []).map((f) => ({
      id: f._id,
      locationId: f.locationId,
      name: f.name,
      type: f.type ?? "funnel",
      url: f.url,
      domain: f.domain,
      createdAt: f.dateAdded,
      updatedAt: f.dateUpdated,
    }));
  }

  // Official endpoint: GET /funnels/page
  async getFunnelPages(funnelId: string, locationId: string): Promise<GhlPage[]> {
    const funnels = await this.listFunnels(locationId);
    const source = funnels.find((f) => f.id === funnelId);

    const response = await this.client.get<FunnelPageListResponse>(
      "/funnels/page",
      { funnelId, locationId, limit: 100, skip: 0 }
    );

    return (response.pages ?? []).map((p) => ({
      id: p.id,
      locationId: p.locationId,
      funnelId: p.funnelId,
      name: p.name,
      stepId: p.stepId,
      url: p.url,
      previewUrl: this.resolvePageUrl(source?.url, source?.domain, p.url, p.path),
      path: p.path,
      title: p.title,
      description: p.description,
      keywords: p.keywords,
      og: p.og,
      customHead: p.customHeadCode,
      customBody: p.customBodyCode,
      builderVersion: p.builderVersion,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async getFunnelPageCount(locationId: string): Promise<number> {
    const response = await this.client.get<{ total: number }>(
      "/funnels/page/count",
      { locationId }
    );
    return response.total ?? 0;
  }
}

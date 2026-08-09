import { GhlApiClient } from "./client";
import type { GhlWebsite, GhlPage } from "@/types";

interface FunnelListResponse {
  funnels: Array<{
    _id: string;
    locationId: string;
    name: string;
    type?: string;
    url?: string;
    domain?: string;
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
    url?: string;
    path?: string;
    title?: string;
    description?: string;
    keywords?: string;
    customHeadCode?: string;
    customBodyCode?: string;
    og?: { title?: string; description?: string; image?: string; url?: string };
    builderVersion?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total?: number;
}

// IMPORTANT: GHL API v2 has NO dedicated Websites endpoint.
// Websites and Funnels share the same /funnels/funnel/list endpoint.
// The "type" parameter distinguishes them: "funnel" vs "website".
export class GhlWebsitesService {
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

  async listWebsites(locationId: string): Promise<GhlWebsite[]> {
    const [websiteRes, funnelRes] = await Promise.allSettled([
      this.client.get<FunnelListResponse>("/funnels/funnel/list", { locationId, limit: 100, skip: 0, type: "website" }),
      this.client.get<FunnelListResponse>("/funnels/funnel/list", { locationId, limit: 100, skip: 0, type: "funnel" }),
    ]);

    const websites = websiteRes.status === "fulfilled" ? (websiteRes.value.funnels ?? []) : [];
    const funnels = funnelRes.status === "fulfilled" ? (funnelRes.value.funnels ?? []) : [];

    const seen = new Set<string>();
    const all = [...websites, ...funnels].filter((f) => {
      if (seen.has(f._id)) return false;
      seen.add(f._id);
      return true;
    });

    return all.map((f) => ({
      id: f._id,
      locationId: f.locationId,
      name: f.name,
      url: f.url,
      domain: f.domain,
      createdAt: f.dateAdded,
      updatedAt: f.dateUpdated,
    }));
  }

  async getWebsitePages(websiteId: string, locationId: string): Promise<GhlPage[]> {
    const websites = await this.listWebsites(locationId);
    const source = websites.find((w) => w.id === websiteId);

    const response = await this.client.get<FunnelPageListResponse>(
      "/funnels/page",
      { funnelId: websiteId, locationId, limit: 100, skip: 0 }
    );

    return (response.pages ?? []).map((p) => ({
      id: p.id,
      locationId: p.locationId,
      websiteId: p.funnelId,
      name: p.name,
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
}

import { GhlApiClient } from "./client";
import type { GhlMediaListResponse, GhlMediaFile } from "./types";

export class GhlMediaService {
  constructor(private client: GhlApiClient) {}

  async listMedia(locationId: string, page = 1, limit = 100): Promise<GhlMediaFile[]> {
    try {
      const response = await this.client.get<GhlMediaListResponse>("/medias/", {
        altId: locationId,
        altType: "location",
        page,
        limit,
        type: "image",
      });
      return response.files ?? [];
    } catch {
      return [];
    }
  }

  async getMediaByUrl(url: string): Promise<Buffer | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }
}

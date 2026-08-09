import { GhlApiClient } from "./client";
import type { GhlLocationResponse } from "./types";
import type { GhlLocation } from "@/types";

export class GhlLocationsService {
  constructor(private client: GhlApiClient) {}

  async getLocation(locationId: string): Promise<GhlLocation> {
    const response = await this.client.get<GhlLocationResponse>(
      `/locations/${locationId}`
    );

    const loc = response.location;
    return {
      id: loc.id,
      name: loc.name,
      companyId: loc.companyId,
      email: loc.email,
      phone: loc.phone,
      address: [loc.address1, loc.city, loc.state, loc.country]
        .filter(Boolean)
        .join(", "),
      website: loc.website,
      timezone: loc.timezone,
      logoUrl: loc.logoUrl,
    };
  }
}

export interface GhlTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  userType: string;
  locationId?: string;
  companyId?: string;
  approvedLocations?: string[];
  userId?: string;
  planId?: string;
}

export interface GhlOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GhlApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface GhlLocationResponse {
  location: {
    id: string;
    name: string;
    companyId: string;
    email: string;
    phone: string;
    address1: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    website: string;
    timezone: string;
    logoUrl?: string;
    domain?: string;
  };
}

export interface GhlFunnelListResponse {
  funnels: GhlFunnelItem[];
  count: number;
  total: number;
}

export interface GhlFunnelItem {
  _id: string;
  locationId: string;
  name: string;
  type?: string;
  url?: string;
  domain?: string;
  faviconUrl?: string;
  isStoreActive?: boolean;
  dateAdded: string;
  dateUpdated: string;
}

export interface GhlFunnelPageListResponse {
  pages: GhlFunnelPageItem[];
  total?: number;
}

export interface GhlFunnelPageItem {
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
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  };
  builderVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GhlMediaFile {
  id: string;
  altId: string;
  altType: string;
  name: string;
  url: string;
  path?: string;
  mimeType?: string;
  size?: number;
  type?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GhlMediaListResponse {
  files: GhlMediaFile[];
  total?: number;
}

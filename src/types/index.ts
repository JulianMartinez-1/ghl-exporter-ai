export type { ExportStatus, ExtractionMethod, SourceType, LogLevel } from "@prisma/client";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface GhlLocation {
  id: string;
  name: string;
  companyId: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  timezone?: string;
  logoUrl?: string;
}

export interface GhlFunnel {
  id: string;
  locationId: string;
  name: string;
  type: string;
  url?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  pages?: GhlPage[];
}

export interface GhlWebsite {
  id: string;
  locationId: string;
  name: string;
  url?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  pages?: GhlPage[];
}

export interface GhlPage {
  id: string;
  locationId: string;
  funnelId?: string;
  websiteId?: string;
  name: string;
  stepId?: string;
  url?: string;
  previewUrl?: string;
  path?: string;
  title?: string;
  description?: string;
  keywords?: string;
  og?: Record<string, string>;
  pixels?: string[];
  customHead?: string;
  customBody?: string;
  builderVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedPage {
  html: string;
  css: string[];
  externalCssUrls: string[];
  scripts: ExtractedAsset[];
  images: ExtractedAsset[];
  fonts: ExtractedAsset[];
  videos: ExtractedAsset[];
  metadata: PageMetadata;
  components: DetectedComponent[];
  method: "api" | "playwright" | "hybrid" | "fetch";
}

export interface ExtractedAsset {
  originalUrl: string;
  localPath: string;
  mimeType: string;
  size?: number;
  content?: Buffer;
}

export interface PageMetadata {
  title: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  favicon?: string;
  lang?: string;
}

export interface DetectedComponent {
  type: ComponentType;
  html: string;
  confidence: number;
  order: number;
}

export type ComponentType =
  | "navbar"
  | "hero"
  | "about"
  | "gallery"
  | "pricing"
  | "services"
  | "faq"
  | "testimonials"
  | "contact"
  | "cta"
  | "footer"
  | "generic";

export interface GeneratedProject {
  name: string;
  files: GeneratedFile[];
  packageJson: Record<string, unknown>;
}

export interface GeneratedFile {
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
}

export interface ExportJobData {
  exportId: string;
  userId: string;
  connectionId: string;
  sourceType: string;
  sourceId: string;
  pageId: string;
  pageUrl?: string;
  rawHtml?: string;
}

export interface GitHubRepoResult {
  name: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
}

export interface VercelDeployResult {
  projectId: string;
  deploymentId: string;
  url: string;
  state: string;
}

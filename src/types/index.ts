export type { ExportStatus, ExtractionMethod, LogLevel } from "@prisma/client";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
  method: "playwright" | "fetch" | "html-pasted";
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
  url: string;
  rawHtml?: string;
}

export interface GitHubRepoResult {
  name: string;
  owner: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
}

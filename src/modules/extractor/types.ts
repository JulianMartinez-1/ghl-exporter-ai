export interface RawAsset {
  url: string;
  type: "image" | "font" | "css" | "js" | "svg" | "video" | "other";
  content?: Buffer;
  mimeType?: string;
}

export interface ExtractionResult {
  html: string;
  inlineStyles: string;
  externalCssUrls: string[];
  assets: RawAsset[];
  metadata: {
    title: string;
    description?: string;
    ogImage?: string;
    ogTitle?: string;
    favicon?: string;
    lang: string;
  };
  extractionMethod: "playwright" | "fetch";
}

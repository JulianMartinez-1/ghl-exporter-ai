import path from "path";
import { createHash } from "crypto";
import type { RawAsset } from "./types";
import type { ExtractedAsset } from "@/types";

export class ResourceNormalizer {
  /**
   * Normalizes raw assets into a consistent structure,
   * deduplicates, and assigns deterministic local paths.
   */
  normalize(assets: RawAsset[]): ExtractedAsset[] {
    const seen = new Set<string>();
    const result: ExtractedAsset[] = [];

    for (const asset of assets) {
      const key = asset.url;
      if (seen.has(key)) continue;
      seen.add(key);

      const localPath = this.buildLocalPath(asset);
      result.push({
        originalUrl: asset.url,
        localPath,
        mimeType: asset.mimeType ?? this.inferMimeType(asset.url),
        size: asset.content?.length,
        content: asset.content,
      });
    }

    return result;
  }

  /**
   * Rewrites all asset URLs in HTML to use local paths.
   */
  rewriteHtmlAssetUrls(html: string, assets: ExtractedAsset[]): string {
    let result = html;
    for (const asset of assets) {
      // Only rewrite to a local /assets/ path when the file was actually captured.
      // If content is missing (asset too large, download failed, etc.) the original
      // CDN URL is kept so the browser can still load it directly — a broken
      // /assets/... 404 is worse than a live CDN URL.
      if (!asset.content) continue;
      const escapedUrl = asset.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(
        new RegExp(escapedUrl, "g"),
        `/assets/${path.basename(asset.localPath)}`
      );
    }
    return result;
  }

  private buildLocalPath(asset: RawAsset): string {
    const ext = this.getExtension(asset.url, asset.mimeType);
    const hash = createHash("md5").update(asset.url).digest("hex").slice(0, 8);
    const baseName = this.sanitizeFilename(path.basename(new URL(asset.url.startsWith("http") ? asset.url : `https://example.com${asset.url}`).pathname));
    return `${asset.type}/${hash}-${baseName}${ext}`;
  }

  private getExtension(url: string, mimeType?: string): string {
    // Try to get from URL first
    try {
      const pathname = new URL(url.startsWith("http") ? url : `https://example.com${url}`).pathname;
      const ext = path.extname(pathname);
      if (ext) return "";
    } catch {
      // ignore
    }

    // Fall back to MIME type
    if (!mimeType) return "";
    const mimeMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "image/svg+xml": ".svg",
      "image/x-icon": ".ico",
      "font/woff": ".woff",
      "font/woff2": ".woff2",
      "font/ttf": ".ttf",
      "text/css": ".css",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/ogg": ".ogv",
      "video/quicktime": ".mov",
    };
    return mimeMap[mimeType] ?? "";
  }

  private inferMimeType(url: string): string {
    const ext = path.extname(url).toLowerCase();
    const map: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".ttf": "font/ttf",
      ".css": "text/css",
      ".js": "text/javascript",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".ogv": "video/ogg",
      ".mov": "video/quicktime",
    };
    return map[ext] ?? "application/octet-stream";
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^\w.-]/g, "-")
      .replace(/-{2,}/g, "-")
      .slice(0, 40);
  }
}

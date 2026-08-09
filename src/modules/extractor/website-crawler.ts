import { PlaywrightExtractor } from "./playwright-extractor";
import { ResourceNormalizer } from "./resource-normalizer";
import type { ExtractedPage } from "@/types";

export interface CrawledPage {
  url: string;
  /** Normalized pathname, e.g. "/" or "/about" or "/blog/post-1" */
  path: string;
  extracted: ExtractedPage;
}

export interface CrawledSite {
  pages: CrawledPage[];
  baseUrl: string;
}

const SKIP_EXTENSIONS = new Set([
  "pdf", "zip", "rar", "gz", "tar",
  "jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp",
  "mp4", "webm", "ogv", "mov", "avi", "wmv",
  "mp3", "ogg", "wav", "flac",
  "woff", "woff2", "ttf", "eot",
  "css", "js", "json", "xml", "txt", "csv",
  "exe", "dmg", "pkg",
]);

export class WebsiteCrawler {
  private extractor = new PlaywrightExtractor();
  private normalizer = new ResourceNormalizer();

  async crawl(
    startUrl: string,
    maxPages = 25,
    onProgress?: (msg: string) => void
  ): Promise<CrawledSite> {
    const base = new URL(startUrl);
    const baseOrigin = base.origin;

    const visited = new Set<string>();
    const queue: string[] = [this.normalizeUrl(startUrl)];
    const pages: CrawledPage[] = [];
    let firstError: string | undefined;

    while (queue.length > 0 && pages.length < maxPages) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      onProgress?.(`[${pages.length + 1}/${maxPages}] Extrayendo: ${url}`);

      try {
        const result = await this.extractor.extract(url);
        const normalizedAssets = this.normalizer.normalize(result.assets);

        const cssAssetContent = normalizedAssets
          .filter((a) => {
            if (a.mimeType?.startsWith("text/css")) return true;
            if (!a.mimeType || a.mimeType === "application/octet-stream") {
              const cleanUrl = a.originalUrl.split("?")[0].split("#")[0];
              if (cleanUrl.endsWith(".css")) return true;
              if (a.localPath.startsWith("css/")) return true;
            }
            return false;
          })
          .filter((a) => a.content && (a.content as Buffer).length > 0)
          .map((a) => this.resolveCssUrls((a.content as Buffer).toString("utf8"), a.originalUrl));

        const jsAssets = normalizedAssets.filter((a) =>
          a.mimeType?.startsWith("text/javascript") ||
          a.mimeType?.startsWith("application/javascript") ||
          a.mimeType?.startsWith("application/x-javascript") ||
          a.mimeType?.includes("ecmascript")
        );

        const extracted: ExtractedPage = {
          html: result.html,
          css: [result.inlineStyles, ...cssAssetContent],
          externalCssUrls: result.externalCssUrls,
          scripts: jsAssets,
          images: normalizedAssets.filter((a) => a.mimeType.startsWith("image/")),
          fonts: normalizedAssets.filter((a) => a.mimeType.startsWith("font/")),
          videos: normalizedAssets.filter((a) => a.mimeType.startsWith("video/")),
          metadata: {
            title: result.metadata.title,
            description: result.metadata.description,
            ogTitle: result.metadata.ogTitle,
            ogImage: result.metadata.ogImage,
            favicon: result.metadata.favicon,
            lang: result.metadata.lang ?? "en",
          },
          components: [],
          method: result.extractionMethod === "playwright" ? "playwright" : "fetch",
        };

        const urlPath = new URL(url).pathname || "/";
        pages.push({ url, path: urlPath, extracted });

        // Discover internal links
        const links = this.extractLinks(result.html, baseOrigin, url);
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!firstError) firstError = msg;
        onProgress?.(`Error en ${url}: ${msg} — omitiendo.`);
      }
    }

    if (pages.length === 0) {
      throw new Error(
        firstError
          ? `No se pudo extraer la página.\n${firstError}`
          : `No se pudo extraer ninguna página desde ${startUrl}. Verifica que la URL sea accesible públicamente.`
      );
    }

    onProgress?.(`Crawl completado: ${pages.length} página(s) extraída(s).`);
    return { pages, baseUrl: startUrl };
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hash = "";
      u.search = "";
      // Remove trailing slash unless it's the root
      if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/+$/, "");
      return u.toString();
    } catch {
      return url;
    }
  }

  private resolveCssUrls(css: string, cssSourceUrl: string): string {
    return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (match, quote, href) => {
      const trimmed = href.trim();
      if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("http") || trimmed.startsWith("//") || trimmed.startsWith("#")) {
        return match;
      }
      try {
        const resolved = new URL(trimmed, cssSourceUrl).href;
        return `url(${quote}${resolved}${quote})`;
      } catch {
        return match;
      }
    });
  }

  private extractLinks(html: string, baseOrigin: string, currentUrl: string): string[] {
    const links: string[] = [];
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;

    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1]?.trim();
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href === "#") continue;

      try {
        const resolved = new URL(href, currentUrl);

        // Same origin only
        if (resolved.origin !== baseOrigin) continue;

        // Skip asset file extensions
        const ext = resolved.pathname.split(".").pop()?.toLowerCase();
        if (ext && SKIP_EXTENSIONS.has(ext)) continue;

        links.push(this.normalizeUrl(resolved.toString()));
      } catch {
        // ignore malformed URLs
      }
    }

    return [...new Set(links)];
  }
}

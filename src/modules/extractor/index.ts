import { ApiExtractor } from "./api-extractor";
import { PlaywrightExtractor } from "./playwright-extractor";
import { ResourceNormalizer } from "./resource-normalizer";
import type { ExtractionContext, ExtractionResult } from "./types";
import type { GhlPage, ExtractedPage } from "@/types";

function rewriteCssUrls(css: string, baseUrl: string): string {
  // Rewrite url() references
  let result = css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (match, quote, rawUrl) => {
    const url = rawUrl.trim();
    if (!url || url.startsWith("data:") || url.startsWith("http") || url.startsWith("//")) {
      return match;
    }
    try {
      const absolute = new URL(url, baseUrl).href;
      return `url(${quote}${absolute}${quote})`;
    } catch {
      return match;
    }
  });

  // Rewrite @import "relative/path" and @import url('relative/path') to absolute.
  // Playwright's network interceptor captures imported CSS as separate files, so
  // their content is already in cssAssetContent. Rewriting to absolute prevents
  // the browser from trying to re-fetch them relative to /ghl-styles.css on Vercel.
  result = result.replace(
    /@import\s+(?:url\(\s*)?(['"]?)([^'");\s]+)\1(?:\s*\))?/g,
    (match, _quote, rawUrl) => {
      const url = rawUrl.trim();
      if (!url || url.startsWith("http") || url.startsWith("//") || url.startsWith("data:")) {
        return match;
      }
      try {
        const absolute = new URL(url, baseUrl).href;
        return match.replace(url, absolute);
      } catch {
        return match;
      }
    }
  );

  return result;
}

export class ExtractionOrchestrator {
  private apiExtractor = new ApiExtractor();
  private playwrightExtractor = new PlaywrightExtractor();
  private normalizer = new ResourceNormalizer();

  async extract(
    page: GhlPage,
    context: ExtractionContext,
    onProgress?: (msg: string) => void
  ): Promise<ExtractedPage> {
    onProgress?.("Iniciando extracción — intentando API primero...");

    // Layer 1: API extraction
    const apiResult = await this.apiExtractor.extract(page);

    let finalResult: ExtractionResult;

    if (!apiResult.needsPlaywright && apiResult.html) {
      onProgress?.("Datos completos obtenidos desde la API.");
      finalResult = {
        html: apiResult.html,
        inlineStyles: apiResult.inlineStyles ?? "",
        externalCssUrls: apiResult.externalCssUrls ?? [],
        assets: apiResult.assets ?? [],
        metadata: apiResult.metadata ?? { title: page.name, lang: "en" },
        extractionMethod: "api",
      };
    } else {
      // Layer 2: Playwright fallback
      onProgress?.("La API no provee HTML renderizado. Iniciando Playwright...");

      // Validate the URL is a real internet URL (has a domain with a TLD)
      const urlToExtract = context.pageUrl?.trim();
      const hasRealDomain = (() => {
        if (!urlToExtract) return false;
        try {
          const candidate = urlToExtract.startsWith("http") ? urlToExtract : `https://${urlToExtract}`;
          return new URL(candidate).hostname.includes(".");
        } catch { return false; }
      })();

      if (!hasRealDomain) {
        throw new Error(
          `La página "${page.name}" no tiene una URL pública válida configurada en GoHighLevel` +
          (urlToExtract ? ` (se recibió: "${urlToExtract}")` : "") +
          `. Por favor, usa la opción "URL directa" e ingresa la URL pública completa de la página (ej: https://tusitio.com/pagina).`
        );
      }

      const playwrightResult = await this.playwrightExtractor.extract(urlToExtract);

      const usedMethod = playwrightResult.extractionMethod; // "playwright" or "fetch"
      onProgress?.(
        usedMethod === "fetch"
          ? "Playwright bloqueado por Cloudflare — extracción estática via fetch completada."
          : "Playwright completó la extracción. Normalizando recursos..."
      );

      // Merge API metadata with Playwright/fetch content (hybrid)
      finalResult = {
        ...playwrightResult,
        metadata: {
          title: apiResult.metadata?.title ?? playwrightResult.metadata.title,
          description: apiResult.metadata?.description ?? playwrightResult.metadata.description,
          ogTitle: apiResult.metadata?.ogTitle ?? playwrightResult.metadata.ogTitle,
          ogImage: apiResult.metadata?.ogImage ?? playwrightResult.metadata.ogImage,
          favicon: playwrightResult.metadata.favicon,
          lang: playwrightResult.metadata.lang ?? "en",
        },
        // Store both playwright and fetch as "hybrid" in DB (no schema migration needed)
        extractionMethod: "hybrid",
      };
    }

    // Normalize assets
    const normalizedAssets = this.normalizer.normalize(finalResult.assets);

    // CSS assets downloaded by Playwright's network interception — embed their text content.
    // Rewrite relative url() references to absolute so they keep working from /ghl-styles.css.
    const cssAssetContent = normalizedAssets
      .filter((a) => {
        if (a.mimeType?.startsWith("text/css")) return true;
        // S3 / some CDNs send application/octet-stream even for CSS files —
        // fall back to URL extension or localPath prefix (set from Playwright resourceType).
        if (!a.mimeType || a.mimeType === "application/octet-stream") {
          const cleanUrl = a.originalUrl.split("?")[0].split("#")[0];
          if (cleanUrl.endsWith(".css")) return true;
          // ResourceNormalizer.buildLocalPath sets type prefix from RawAsset.type.
          // Playwright sets type="css" for resourceType==="stylesheet" — trust that.
          if (a.localPath.startsWith("css/")) return true;
        }
        return false;
      })
      .filter((a) => a.content && (a.content as Buffer).length > 0)
      .map((a) => {
        const css = (a.content as Buffer).toString("utf8");
        return rewriteCssUrls(css, a.originalUrl);
      });

    const jsAssets = normalizedAssets.filter((a) =>
      a.mimeType?.startsWith("text/javascript") ||
      a.mimeType?.startsWith("application/javascript") ||
      a.mimeType?.startsWith("application/x-javascript") ||
      a.mimeType?.includes("ecmascript")
    );

    return {
      html: finalResult.html,
      css: [finalResult.inlineStyles, ...cssAssetContent],
      externalCssUrls: finalResult.externalCssUrls,
      scripts: jsAssets,
      images: normalizedAssets.filter((a) => a.mimeType.startsWith("image/")),
      fonts: normalizedAssets.filter((a) => a.mimeType.startsWith("font/")),
      videos: normalizedAssets.filter((a) => a.mimeType.startsWith("video/")),
      metadata: {
        title: finalResult.metadata.title,
        description: finalResult.metadata.description,
        ogTitle: finalResult.metadata.ogTitle,
        ogImage: finalResult.metadata.ogImage,
        favicon: finalResult.metadata.favicon,
        lang: finalResult.metadata.lang,
      },
      components: [],
      method: finalResult.extractionMethod,
    };
  }
}

export { ApiExtractor } from "./api-extractor";
export { PlaywrightExtractor } from "./playwright-extractor";
export { ResourceNormalizer } from "./resource-normalizer";
export type * from "./types";

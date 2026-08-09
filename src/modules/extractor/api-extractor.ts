import type { GhlPage } from "@/types";
import type { ExtractionResult, RawAsset } from "./types";

export class ApiExtractor {
  /**
   * Attempts to build extraction result from GHL API page data.
   * GHL does not expose rendered HTML via API — only metadata and custom code.
   * Returns partial result with what's available; flags gaps for Playwright fallback.
   */
  async extract(page: GhlPage): Promise<Partial<ExtractionResult> & { needsPlaywright: boolean }> {
    const assets: RawAsset[] = [];
    const externalCssUrls: string[] = [];
    let inlineStyles = "";
    let html = "";

    // Collect custom head/body code if present
    if (page.customHead) {
      // Extract CSS links from custom head
      const cssLinkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = cssLinkRegex.exec(page.customHead)) !== null) {
        if (match[1]) externalCssUrls.push(match[1]);
      }
      // Extract inline styles
      const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      while ((match = styleRegex.exec(page.customHead)) !== null) {
        if (match[1]) inlineStyles += `\n${match[1]}`;
      }
    }

    if (page.customBody) {
      html = page.customBody;
    }

    const metadata = {
      title: page.title ?? page.name ?? "Untitled",
      description: page.description,
      ogTitle: page.og?.["title"],
      ogImage: page.og?.["image"],
      lang: "en",
    };

    // The GHL API does NOT provide rendered HTML from the page builder.
    // We only have metadata and optional custom code injections.
    // If there's no custom body HTML, we need Playwright.
    const hasRealContent = html.length > 200;
    const needsPlaywright = !hasRealContent;

    return {
      html,
      inlineStyles,
      externalCssUrls,
      assets,
      metadata,
      extractionMethod: hasRealContent ? "api" : "hybrid",
      needsPlaywright,
    };
  }
}

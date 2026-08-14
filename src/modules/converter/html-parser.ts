import { load, type CheerioAPI } from "cheerio";

export interface ScriptEntry {
  kind: "external" | "inline";
  value: string;           // src URL for external, code text for inline
  attrs: Record<string, string>; // type, defer, async, crossorigin, etc.
}

export interface ParsedHtml {
  $: CheerioAPI;
  bodyContent: string;
  headContent: string;
  inlineScripts: string[];
  externalScripts: string[];
  orderedScripts: ScriptEntry[]; // original document order, attributes preserved
  externalStyles: string[];
  inlineStyles: string[];
  cleanBodyHtml: string;
  bodyAttribs: Record<string, string>; // class, style, data-* preserved on <body>
  htmlAttribs: Record<string, string>;  // class, style preserved on <html>
}

// Scripts to strip from the final export.
// IMPORTANT: Do NOT add "msgsndr.com" here.
// GHL's page builder runtime (animations, header scroll, tabs, sliders, etc.)
// lives on the msgsndr.com CDN. Blocking it destroys all interactive behaviors.
// Only block known tracking/CRM/chat scripts that break a standalone deployment.
const BLOCKED_SCRIPT_PATTERNS = [
  "googletagmanager",
  "google-analytics",
  "facebook.net",
  "connect.facebook.net",
  "hotjar",
  "intercom",
  "drift.com",
  "crisp.chat",
  "tawk.to",
  "segment.com/analytics",
  "clarity.ms",
  // GHL-specific: CRM/chat/form widgets — these depend on GHL's backend
  // and do not contribute to visual animations or page behavior.
  "form_embed",
  "form-embed.js",
  "hl-chat",
  "hl-messenger",
  "msgsndr-chat",
  // GHL app dashboard scripts (not CDN — these are GHL's internal routing)
  "gohighlevel.com/js",
  "leadconnectorhq.com/js",
  "leadconnectorhq.com/widget",
];

export class HtmlParser {
  parse(rawHtml: string): ParsedHtml {
    const $ = load(rawHtml);

    const externalScripts: string[] = [];
    const inlineScripts: string[] = [];
    const orderedScripts: ScriptEntry[] = [];
    const externalStyles: string[] = [];
    const inlineStyles: string[] = [];

    // Process scripts — collect in document order so library init order is preserved.
    // All scripts are removed from the DOM and re-added at end of body by the converter.
    $("script").each((_, el) => {
      const src = $(el).attr("src");
      const content = $(el).html() ?? "";
      // Capture all element attributes (type, defer, async, crossorigin, etc.)
      const rawAttrs: Record<string, string> = (el as unknown as { attribs?: Record<string, string> }).attribs ?? {};

      if (src) {
        const isBlocked = BLOCKED_SCRIPT_PATTERNS.some((p) => src.includes(p));
        if (isBlocked) {
          $(el).remove();
        } else {
          externalScripts.push(src);
          const attrs: Record<string, string> = {};
          for (const [k, v] of Object.entries(rawAttrs)) {
            // Strip defer and async: all scripts move to end of body where
            // these attributes break init order (a deferred library script runs
            // AFTER a non-deferred inline AOS.init() call, crashing init).
            if (k === "src" || k === "defer" || k === "async") continue;
            attrs[k] = v;
          }
          orderedScripts.push({ kind: "external", value: src, attrs });
          $(el).remove();
        }
      } else {
        const isTracking =
          content.includes("gtag(") ||
          content.includes("fbq(") ||
          content.includes("_hsq") ||
          content.includes("Intercom") ||
          BLOCKED_SCRIPT_PATTERNS.some((p) => content.includes(p));

        // Don't block scripts that also contain page/library init code — killing them
        // removes AOS.init(), Swiper init, etc. even though only the tracking part is unwanted.
        const hasPageInit =
          content.includes("AOS.init") ||
          content.includes("ScrollReveal") ||
          content.includes("Swiper(") ||
          content.includes("new Swiper") ||
          content.includes("GLightbox") ||
          content.includes("gsap.") ||
          content.includes("ScrollTrigger") ||
          content.includes("anime(") ||
          content.includes("magnificPopup") ||
          content.includes(".isotope(") ||
          content.includes("new Isotope") ||
          content.includes("$(document)") ||
          content.includes("$(function") ||
          content.includes("DOMContentLoaded") ||
          content.includes("addEventListener") ||
          content.includes(".on('click") ||
          content.includes('.on("click') ||
          content.includes(".click(") ||
          content.includes("parallax") ||
          content.includes("jarallax") ||
          content.includes(".swiper") ||
          content.includes("accordion") ||
          content.includes("lightbox") ||
          content.includes("carousel") ||
          content.includes("owlCarousel") ||
          content.includes(".slick(") ||
          content.includes("new Slick") ||
          content.includes("CountUp") ||
          content.includes("countUp") ||
          content.includes("new Typed") ||
          content.includes("Typed(") ||
          content.includes("fancybox") ||
          content.includes("Fancybox") ||
          content.includes("tippy(") ||
          content.includes("featherlight") ||
          content.includes("colorbox") ||
          content.includes("venobox") ||
          content.includes("lity(") ||
          content.includes("modal") ||
          content.includes("popup") ||
          content.includes("tabs(") ||
          content.includes("tab(") ||
          content.includes("slider") ||
          content.includes("gallery") ||
          content.includes("toggle") ||
          content.includes("dropdown");

        if (isTracking && !hasPageInit) {
          $(el).remove();
        } else if (content.trim().length > 0) {
          inlineScripts.push(content);
          orderedScripts.push({ kind: "inline", value: content, attrs: { ...rawAttrs } });
          $(el).remove();
        }
      }
    });

    // Process styles
    $("style").each((_, el) => {
      const content = $(el).html() ?? "";
      if (content.trim()) {
        inlineStyles.push(content);
      }
    });

    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) externalStyles.push(href);
      $(el).remove(); // remove from DOM — broken relative URLs would 404 on Vercel; content comes from ghl-styles.css
    });

    // Preload hints for stylesheets are also obsolete once we serve ghl-styles.css
    $('link[rel="preload"][as="style"]').remove();

    // Remove only specific known GHL widgets — do NOT use [id*="hl-"] or [class*="hl-"]
    // because GHL's page builder uses classes like hl-text-element, hl-image, hl-button, etc.
    // that are actual page content.
    $(
      '#hl-messenger-frame, .hl-sticky-contact-form-button, ' +
      '#hl-chat-widget-container, .hl-chat-widget, ' +
      '[id="hl-messenger"], [class="hl-messenger"]'
    ).remove();

    // Remove GHL CDN CSS links — their content is already embedded in ghl-styles.css.
    // Do NOT remove script tags from msgsndr.com here: GHL's page builder runtime
    // (animations, header scroll, tabs, sliders) lives on that CDN and must execute.
    $('link[rel="stylesheet"][href*="msgsndr.com"]').remove();
    $('link[rel="stylesheet"][href*="leadconnectorhq.com"]').remove();
    // Only remove msgsndr.com scripts that are known CRM/chat/form widgets.
    // The page builder bundle and animation scripts must remain.
    $('script[src*="form_embed"]').remove();
    $('script[src*="hl-chat"]').remove();
    $('script[src*="hl-messenger"]').remove();
    $('script[src*="msgsndr-chat"]').remove();

    // Restore animation-library elements to their ready-to-animate state.
    // Goal: preserve data-aos / data-wow / data-sal attributes so the libraries
    // re-initialize on Vercel and scroll animations actually play.
    //
    // AOS: keep 'aos-init' (prevents CSS fallback flash before AOS.js loads).
    //       remove 'aos-animate' so AOS re-adds it as the user scrolls.
    //       strip any !important inline overrides from a Playwright force-visible pass.
    //       strip inline opacity:0 — AOS CSS sets the initial state; inline 0 would override
    //       the .aos-animate rule since inline beats CSS selectors.
    $("[data-aos]").each((_, el) => {
      const existing = $(el).attr("class") ?? "";
      const cleaned = existing
        .split(/\s+/)
        .filter((c) => c !== "aos-animate") // remove animated state; keep aos-init
        .join(" ")
        .trim();
      // Ensure aos-init is present (prevents CSS fallback from firing prematurely)
      const withInit = cleaned.includes("aos-init") ? cleaned : (cleaned ? `${cleaned} aos-init` : "aos-init");
      $(el).attr("class", withInit);

      const style = $(el).attr("style") ?? "";
      const fixed = style
        .replace(/\bopacity\s*:\s*[01][^;]*!important\s*;?\s*/g, "") // strip !important overrides
        .replace(/\btransform\s*:\s*none\s*!important\s*;?\s*/g, "")
        .replace(/\bvisibility\s*:\s*visible\s*!important\s*;?\s*/g, "")
        .replace(/\bopacity\s*:\s*0[^;]*;?\s*/g, "")  // inline opacity:0 would override AOS .aos-animate rule
        .trim();
      if (fixed) $(el).attr("style", fixed);
      else $(el).removeAttr("style");
    });

    // WOW.js: remove 'animated'/'wow-animated' so WOW re-triggers on scroll.
    // Keep 'wow' class and all data-wow-* attributes intact.
    $(".wow").each((_, el) => {
      const existing = $(el).attr("class") ?? "";
      const cleaned = existing
        .split(/\s+/)
        .filter((c) => c !== "animated" && c !== "wow-animated")
        .join(" ")
        .trim();
      if (cleaned) $(el).attr("class", cleaned);
    });

    // SAL / ScrollReveal: remove state attribute so SAL re-animates on scroll.
    // Keep data-sal and all data-sal-* duration/easing attributes.
    $("[data-sal]").removeAttr("data-sal-state");

    // Strip inline opacity:0 / visibility:hidden from non-animation elements.
    // These come from GHL stagger / custom init patterns that depend on GHL platform JS.
    // Animation elements are skipped — their initial state is set by their library's CSS,
    // which is embedded in ghl-styles.css.
    $("[style]").each((_, el) => {
      if ($(el).attr("data-aos") || $(el).hasClass("wow") || $(el).attr("data-sal")) return;
      const style = $(el).attr("style") ?? "";
      let fixed = style;
      if (/\bopacity\s*:\s*0/.test(fixed)) {
        fixed = fixed.replace(/\bopacity\s*:\s*0[^;]*;?\s*/g, "");
      }
      if (/\bvisibility\s*:\s*hidden/.test(fixed)) {
        fixed = fixed.replace(/\bvisibility\s*:\s*hidden[^;]*;?\s*/g, "");
      }
      fixed = fixed.trim();
      if (fixed) $(el).attr("style", fixed);
      else $(el).removeAttr("style");
    });

    const bodyContent = $("body").html() ?? "";
    const headContent = $("head").html() ?? "";
    const cleanBodyHtml = bodyContent;

    // Preserve original attributes from <body> and <html> so the rebuilt page
    // inherits classes/styles that the GHL page builder JS may have set during
    // Playwright capture (e.g. body.hl-page-loaded, body.fonts-loaded, etc.).
    // Without these, CSS rules like "body { opacity:0 } body.hl-page-loaded { opacity:1 }"
    // keep the entire page invisible on Vercel.
    const bodyEl = $("body").get(0) as unknown as { attribs?: Record<string, string> };
    const htmlEl = $("html").get(0) as unknown as { attribs?: Record<string, string> };
    const bodyAttribs: Record<string, string> = { ...(bodyEl?.attribs ?? {}) };
    const htmlAttribs: Record<string, string> = { ...(htmlEl?.attribs ?? {}) };

    return {
      $,
      bodyContent,
      headContent,
      inlineScripts,
      externalScripts,
      orderedScripts,
      externalStyles,
      inlineStyles,
      cleanBodyHtml,
      bodyAttribs,
      htmlAttribs,
    };
  }

  extractColors(css: string): string[] {
    const colorRegex =
      /#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]+\)|hsl[a]?\([^)]+\)/g;
    return [...new Set(css.match(colorRegex) ?? [])].slice(0, 20);
  }

  extractFontFamilies(css: string): string[] {
    // CSS keywords and system fonts that are not valid Google Fonts
    const SKIP = new Set([
      "inherit", "initial", "unset", "revert", "none", "normal",
      "monospace", "cursive", "fantasy", "system-ui", "ui-serif",
      "ui-sans-serif", "ui-monospace", "ui-rounded", "emoji",
      "math", "fangsong",
    ]);
    const SYSTEM_PREFIXES = ["-", "Arial", "Helvetica", "Verdana", "Georgia",
      "Tahoma", "Trebuchet", "Times", "Courier", "Impact", "Comic",
      "BlinkMac", "Segoe", "Lucida"];

    const fontRegex = /font-family\s*:\s*([^;]+)/gi;
    const fonts: string[] = [];
    let match;
    while ((match = fontRegex.exec(css)) !== null) {
      if (match[1]) {
        const families = match[1]
          .split(",")
          .map((f) => f.trim().replace(/['"]/g, "").trim())
          .filter((f) => {
            if (!f) return false;
            if (SKIP.has(f.toLowerCase())) return false;
            if (f.toLowerCase().includes("serif")) return false;
            if (f.toLowerCase().includes("sans")) return false;
            if (SYSTEM_PREFIXES.some((p) => f.startsWith(p))) return false;
            // Must start with uppercase (proper noun = likely a Google Font)
            if (!/^[A-Z]/.test(f)) return false;
            return true;
          });
        fonts.push(...families);
      }
    }
    return [...new Set(fonts)].slice(0, 5);
  }
}

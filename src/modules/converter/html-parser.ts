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

const BLOCKED_SCRIPT_PATTERNS = [
  "googletagmanager",
  "google-analytics",
  "facebook.net",
  "hotjar",
  "intercom",
  "msgsndr.com",
  "gohighlevel.com",
  "drift.com",
  "crisp.chat",
  "tawk.to",
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
          content.includes("dataLayer") ||
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
    $('[src*="msgsndr.com"]').remove();
    $('link[rel="stylesheet"][href*="msgsndr.com"]').remove();

    // Force animation-library elements to their final visible state.
    // Mirrors what the Playwright evaluate step does for live captures.
    // For pasted HTML (no Playwright), this is the only pass.
    // AOS: add aos-init + aos-animate so AOS CSS renders elements visible
    $("[data-aos]").each((_, el) => {
      const existing = $(el).attr("class") ?? "";
      if (!existing.includes("aos-init")) $(el).attr("class", `${existing} aos-init aos-animate`.trim());
      const style = $(el).attr("style") ?? "";
      let fixedStyle = style;
      // Remove opacity:0 (AOS initial state set when page was first rendered)
      if (/opacity\s*:\s*0/.test(fixedStyle)) {
        fixedStyle = fixedStyle.replace(/\bopacity\s*:\s*0[^;]*;?\s*/g, "");
      }
      // Remove opacity:1!important / transform:none!important / visibility:visible!important
      // injected by our Playwright evaluate step. Keeping these !important inline styles
      // prevents AOS from controlling opacity on the deployed site (scroll animations never play).
      // The safety script in buildAnimationSafetyScript handles fallback if AOS fails to load.
      fixedStyle = fixedStyle
        .replace(/\bopacity\s*:\s*1\s*!important\s*;?\s*/g, "")
        .replace(/\btransform\s*:\s*none\s*!important\s*;?\s*/g, "")
        .replace(/\bvisibility\s*:\s*visible\s*!important\s*;?\s*/g, "")
        .trim();
      if (fixedStyle) {
        $(el).attr("style", fixedStyle);
      } else {
        $(el).removeAttr("style");
      }
    });
    // WOW.js
    $(".wow").each((_, el) => {
      const existing = $(el).attr("class") ?? "";
      if (!existing.includes("animated")) $(el).attr("class", `${existing} animated wow-animated`.trim());
    });
    // SAL / ScrollReveal
    $("[data-sal]").attr("data-sal-state", "animated");
    // Remove inline opacity:0 from any element that has it (GHL stagger / custom init)
    $("[style]").each((_, el) => {
      const style = $(el).attr("style") ?? "";
      if (/\bopacity\s*:\s*0/.test(style)) {
        const fixed = style.replace(/\bopacity\s*:\s*0[^;]*;?\s*/g, "").trim();
        if (fixed) $(el).attr("style", fixed);
        else $(el).removeAttr("style");
      }
      if (/\bvisibility\s*:\s*hidden/.test(style)) {
        const fixed = style.replace(/\bvisibility\s*:\s*hidden[^;]*;?\s*/g, "").trim();
        if (fixed) $(el).attr("style", fixed);
        else $(el).removeAttr("style");
      }
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

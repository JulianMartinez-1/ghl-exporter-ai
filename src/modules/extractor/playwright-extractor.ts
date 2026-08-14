import type { ExtractionResult, RawAsset } from "./types";
import { getCfClearance, fetchWithFlareSolverr } from "@/lib/flaresolverr";

interface ResourceEntry {
  url: string;
  type: string;
  mimeType?: string;
  content?: Buffer;
}

type BrowserEngine = "chromium" | "firefox";

export class PlaywrightExtractor {
  private isVibePreview(url: string): boolean {
    try {
      return new URL(url).hostname.endsWith(".vibepreview.com");
    } catch {
      return false;
    }
  }

  async extract(pageUrl: string): Promise<ExtractionResult> {
    let chromiumErr: string | undefined;
    let firefoxErr: string | undefined;

    // 1. Try Chromium
    try {
      return await this.extractWithEngine(pageUrl, "chromium");
    } catch (err) {
      chromiumErr = err instanceof Error ? err.message : String(err);
    }

    // 2. Try Firefox (different TLS fingerprint bypasses some CF checks)
    try {
      return await this.extractWithEngine(pageUrl, "firefox");
    } catch (err) {
      firefoxErr = err instanceof Error ? err.message : String(err);
    }

    // 3. FlareSolverr: get CF clearance cookies → Playwright (full scroll + assets)
    //    Falls back to FlareSolverr static HTML only if Playwright with cookies also fails.
    let fsErr: string | undefined;
    try {
      const clearance = await getCfClearance(pageUrl);
      try {
        return await this.extractWithCfCookies(pageUrl, clearance.cookies, clearance.userAgent);
      } catch (pwErr) {
        // Playwright with cookies failed — fall back to FlareSolverr static HTML
        fsErr = `cookies→playwright: ${pwErr instanceof Error ? pwErr.message : String(pwErr)}`;
        return await fetchWithFlareSolverr(pageUrl);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fsErr = fsErr ?? msg;
    }

    throw new Error(
      `Todos los métodos fallaron para ${pageUrl}.\n` +
      `• Chromium: ${chromiumErr}\n` +
      `• Firefox: ${firefoxErr}\n` +
      `• FlareSolverr: ${fsErr}\n` +
      `Usa la opción "Pegar HTML": abre la página → F12 → Elements → clic derecho en <html> → Copy element.`
    );
  }

  private async extractWithEngine(pageUrl: string, engine: BrowserEngine): Promise<ExtractionResult> {
    const launchArgs =
      engine === "chromium"
        ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
          ]
        : ["--no-sandbox"];

    // Use playwright-extra with stealth plugin for Chromium to bypass CF bot detection.
    // For Firefox use plain playwright (different TLS fingerprint already helps).
    let browser: import("playwright").Browser;
    if (engine === "chromium") {
      const { chromium } = await import("playwright-extra");
      const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
      chromium.use(StealthPlugin());
      browser = await chromium.launch({ headless: true, args: launchArgs });
    } else {
      const playwright = await import("playwright");
      browser = await playwright[engine].launch({ headless: true, args: launchArgs });
    }

    const sharedHeaders: Record<string, string> = {
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Upgrade-Insecure-Requests": "1",
    };
    const chromeHeaders: Record<string, string> = {
      ...sharedHeaders,
      "sec-ch-ua": '"Google Chrome";v="136", "Chromium";v="136", "Not_A Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
    };

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        engine === "chromium"
          ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
          : "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0",
      extraHTTPHeaders: engine === "chromium" ? chromeHeaders : sharedHeaders,
      locale: "en-US",
      timezoneId: "America/New_York",
    });

    const collectedResources: ResourceEntry[] = [];

    await context.route("**/*", async (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      const url = request.url();

      if (
        url.includes("googletagmanager") ||
        url.includes("google-analytics") ||
        url.includes("facebook.net") ||
        url.includes("pixel") ||
        url.includes("hotjar") ||
        url.includes("intercom")
        // NOTE: msgsndr.com scripts are intentionally NOT blocked here.
        // GHL's page builder runtime lives on msgsndr.com and must execute so that:
        // 1. body.hl-page-loaded and similar init classes get set
        // 2. Dynamically-loaded CSS is captured in the CSSOM dump
        // 3. Components initialize correctly (tabs, sliders, etc.)
        // The scripts are stripped from the final HTML by cleanAndGetHtml() and HtmlParser.
      ) {
        await route.abort();
        return;
      }

      try {
        const response = await route.fetch();
        const body = await response.body().catch(() => Buffer.alloc(0));
        const responseMime = response.headers()["content-type"] ?? "";

        // Also capture CSS that some page builders inject via fetch() instead of <link>.
        // resourceType is "fetch" in that case but the content-type is still text/css.
        const isFetchedCss = resourceType === "fetch" && responseMime.startsWith("text/css");
        const effectiveType = isFetchedCss ? "stylesheet" : resourceType;

        if (
          resourceType === "image" ||
          resourceType === "font" ||
          resourceType === "stylesheet" ||
          resourceType === "media" ||
          resourceType === "script" ||
          isFetchedCss
        ) {
          const isMedia = effectiveType === "media";
          const isScript = effectiveType === "script";
          const sizeLimit = isMedia ? 30 * 1024 * 1024 : isScript ? 10 * 1024 * 1024 : Infinity;
          if (body.length <= sizeLimit) {
            collectedResources.push({
              url,
              type: effectiveType,
              mimeType: responseMime || undefined,
              content: body,
            });
          }
        }

        await route.fulfill({ response, body });
      } catch {
        await route.continue();
      }
    });

    const page = await context.newPage();

    const isVibe = this.isVibePreview(pageUrl);
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    try {
      await page.waitForLoadState("load", { timeout: 30_000 });
    } catch { /* continue if load times out on heavy pages */ }
    try {
      await page.waitForLoadState("networkidle", { timeout: isVibe ? 10_000 : 20_000 });
    } catch { /* ok — some pages have persistent polling or WebSockets */ }

    // Detect if we were redirected to a GHL login/auth wall.
    // This happens when the user pastes the GHL dashboard URL instead of the public page URL.
    const finalUrl = page.url();
    const isGhlAuthRedirect =
      /\/(login|sign-in|signin|auth)\b/i.test(finalUrl) ||
      finalUrl.includes("clerk.com") ||
      finalUrl.includes("accounts.google.com");
    if (isGhlAuthRedirect) {
      await browser.close();
      throw new Error(
        `La URL redirigió a una pantalla de inicio de sesión (${finalUrl}). ` +
        `Parece que pegaste la URL del editor de GHL, que requiere login. ` +
        `Para proyectos Vibe/IA: en el editor GHL haz clic en "Preview" → copia la URL (*.vibepreview.com) y úsala.`
      );
    }

    await page.waitForTimeout(isVibe ? 1000 : 1500);

    // First scroll pass: viewport-sized steps so every lazy-loaded section gets time to render
    await page.evaluate(async ({ maxMs, stepMs }: { maxMs: number; stepMs: number }) => {
      await new Promise<void>((resolve) => {
        const vh = window.innerHeight || 800;
        let pos = 0;
        const started = Date.now();
        const step = () => {
          if (Date.now() - started >= maxMs) { resolve(); return; }
          pos += Math.floor(vh * 0.85);
          window.scrollTo(0, pos);
          // Delay the height check so dynamic content has time to expand the DOM.
          // Checking before setTimeout would stop early when IntersectionObserver
          // sections grow the page height after being triggered by the scroll.
          setTimeout(() => {
            if (pos >= document.body.scrollHeight) { resolve(); return; }
            step();
          }, stepMs);
        };
        step();
      });
    }, { maxMs: isVibe ? 8_000 : 25_000, stepMs: isVibe ? 100 : 350 });

    // Wait for network to settle after triggering lazy-loads
    try {
      await page.waitForLoadState("networkidle", { timeout: isVibe ? 8_000 : 20_000 });
    } catch { /* ok */ }
    await page.waitForTimeout(isVibe ? 500 : 1500);

    // Second scroll pass for heavy pages — catches sections that loaded during the first pass
    if (!isVibe) {
      await page.evaluate(async ({ maxMs, stepMs }: { maxMs: number; stepMs: number }) => {
        await new Promise<void>((resolve) => {
          const vh = window.innerHeight || 800;
          let pos = 0;
          const started = Date.now();
          const step = () => {
            if (Date.now() - started >= maxMs) { resolve(); return; }
            pos += Math.floor(vh * 0.85);
            window.scrollTo(0, pos);
            // Check height inside setTimeout so IntersectionObserver-loaded content
            // has time to expand the DOM before we decide we've reached the end.
            setTimeout(() => {
              if (pos >= document.body.scrollHeight) { resolve(); return; }
              step();
            }, stepMs);
          };
          step();
        });
      }, { maxMs: 15_000, stepMs: 300 });
      try {
        await page.waitForLoadState("networkidle", { timeout: 15_000 });
      } catch { /* ok */ }
      await page.waitForTimeout(2000);
    }

    // Final scroll: land at y=80 (above the 50px threshold used by most scroll listeners)
    // so that the header is in its "scrolled" state — solid background, readable text.
    //
    // Why NOT scroll to y=0:
    //   Many pages use a transparent header at the very top (y=0) with white text.
    //   In a static export this state is frozen: no JS will restore a visible header,
    //   so white text stays invisible against the transparent/light background forever.
    //   Capturing at y=80 gives us the header in its solid/visible state without
    //   meaningfully cutting off the hero content (page layout is the same at y=80 vs y=0).
    await page.evaluate(() => window.scrollTo(0, 80));
    await page.waitForTimeout(1000);

    // Force lazy-loaded images and background images to resolve their src so they
    // appear in the captured HTML and get downloaded by the asset interceptor.
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('[data-src]').forEach((el) => {
        const src = el.getAttribute('data-src');
        if (src) { el.setAttribute('src', src); el.removeAttribute('data-src'); }
      });
      document.querySelectorAll<HTMLElement>('[data-lazy-src]').forEach((el) => {
        const src = el.getAttribute('data-lazy-src');
        if (src) { el.setAttribute('src', src); el.removeAttribute('data-lazy-src'); }
      });
      document.querySelectorAll<HTMLElement>('[data-bg]').forEach((el) => {
        const bg = el.getAttribute('data-bg');
        if (bg) { el.style.backgroundImage = `url('${bg}')`; el.removeAttribute('data-bg'); }
      });
      // Remove loading="lazy" so the HTML we export doesn't defer images on deploy
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
        img.removeAttribute('loading');
      });
    });

    // Reset animation state so scroll animations replay correctly on Vercel.
    //
    // Strategy: preserve animation library classes/attributes so AOS/WOW/SAL re-initialize
    // and animate on scroll. We only force-visible elements that depend on GHL platform JS
    // (which we strip), not elements managed by portable animation libraries.
    //
    // Key insight: AOS.js (once:false) removes 'aos-animate' when elements leave the viewport
    // after scrollTo(0,0). This is CORRECT behavior for scroll animations — we keep it.
    // AOS will re-add 'aos-animate' as the user scrolls on Vercel.
    await page.evaluate(() => {
      // AOS: reset to ready-to-animate state.
      // Keep 'aos-init' (prevents CSS fallback flash; AOS.refresh() handles it).
      // Remove 'aos-animate' (re-added by AOS as user scrolls on Vercel).
      // Remove any inline overrides from a previous force-visible pass.
      document.querySelectorAll<HTMLElement>('[data-aos]').forEach((el) => {
        el.classList.add('aos-init');
        el.classList.remove('aos-animate');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('visibility');
      });

      // WOW.js: reset animated state so WOW re-animates on scroll.
      document.querySelectorAll<HTMLElement>('.wow, [data-wow-duration]').forEach((el) => {
        el.classList.remove('animated', 'wow-animated');
        el.style.removeProperty('opacity');
        el.style.removeProperty('visibility');
      });

      // SAL / ScrollReveal: reset state so library re-animates on scroll.
      document.querySelectorAll<HTMLElement>('[data-sal], [data-sr-id]').forEach((el) => {
        el.removeAttribute('data-sal-state');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('visibility');
      });

      // GHL builder wrappers: force visible ONLY for elements NOT managed by animation libs.
      // These depend on GHL platform JS (body.hl-page-loaded, etc.) which we strip — without
      // force-visible they stay hidden forever. Animation-library elements are excluded here
      // because their visibility is controlled by AOS/WOW/SAL, not GHL platform JS.
      document.querySelectorAll<HTMLElement>('.hl-element-wrapper, [data-element-type]').forEach((el) => {
        if (el.hasAttribute('data-aos') || el.classList.contains('wow') || el.hasAttribute('data-sal')) return;
        const cs = window.getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.1 || cs.visibility === 'hidden') {
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('visibility', 'visible', 'important');
        }
      });

      // Strip inline opacity:0 / visibility:hidden from non-animation elements.
      // These come from GHL stagger/init patterns and would stay hidden in a static export.
      // Animation elements are excluded — their initial invisible state is set by CSS, not inline.
      document.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
        if (el.hasAttribute('data-aos') || el.classList.contains('wow') || el.hasAttribute('data-sal')) return;
        if (el.style.opacity === '0') el.style.removeProperty('opacity');
        if (el.style.visibility === 'hidden' && !el.closest('head')) el.style.removeProperty('visibility');
      });

      // Always force body/html visible — GHL sets opacity:0 during JS init and restores it.
      // In a static export the restore never happens without this.
      document.body.style.setProperty('opacity', '1', 'important');
      document.documentElement.style.setProperty('opacity', '1', 'important');
    });

    const cleanAndGetHtml = () => page.evaluate(() => {
      // Remove GHL CRM/chat DOM widgets — these are visual chrome, not page content.
      document.querySelectorAll(
        "#hl-messenger-frame, .hl-sticky-contact-form-button, " +
        "#hl-chat-widget-container, .hl-chat-widget, " +
        "[id='hl-messenger'], [class='hl-messenger']"
      ).forEach((el) => el.remove());

      // Remove only specific scripts we know break a standalone Vercel deployment.
      // Do NOT remove all msgsndr.com scripts — GHL's page builder runtime (animations,
      // header scroll, tabs, sliders, interactive components) lives on that CDN.
      document.querySelectorAll("script[src]").forEach((s) => {
        const src = s.getAttribute("src") ?? "";
        if (
          src.includes("googletagmanager") ||
          src.includes("facebook.net") ||
          src.includes("connect.facebook.net") ||
          src.includes("hotjar") ||
          src.includes("form_embed") ||
          src.includes("hl-chat") ||
          src.includes("hl-messenger") ||
          src.includes("msgsndr-chat") ||
          src.includes("gohighlevel.com")
        ) s.remove();
      });
      // Remove inline-only tracking scripts (gtag/fbq with no page-init code).
      document.querySelectorAll("script:not([src])").forEach((s) => {
        const t = s.textContent ?? "";
        const isTracking = (t.includes("gtag(") || t.includes("fbq(")) &&
          !t.includes("AOS") && !t.includes("Swiper") && !t.includes("gsap") &&
          !t.includes("addEventListener") && !t.includes("DOMContentLoaded");
        if (isTracking) s.remove();
      });
      return document.documentElement.outerHTML;
    });

    let html = await cleanAndGetHtml();

    // CF JS challenge ("Just a moment...") auto-resolves if the browser looks legitimate.
    // Wait 15s and retry once before giving up.
    if (html.includes("Just a moment...") || html.includes("Enable JavaScript and cookies to continue")) {
      await page.waitForTimeout(15_000);
      html = await cleanAndGetHtml();
    }

    const inlineStyles = await page.evaluate(() => {
      const styles: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules ?? []);
          styles.push(rules.map((r) => r.cssText).join("\n"));
        } catch {
          // Cross-origin sheet — skip
        }
      }
      return styles.join("\n");
    });

    const metadata = await page.evaluate(() => {
      const getMeta = (name: string) =>
        document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ??
        document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ??
        undefined;

      return {
        title: document.title ?? "",
        description: getMeta("description"),
        ogTitle: getMeta("og:title"),
        ogDescription: getMeta("og:description"),
        ogImage: getMeta("og:image"),
        favicon:
          (document.querySelector('link[rel="icon"]') as HTMLLinkElement)?.href ??
          (document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement)?.href ??
          undefined,
        lang: document.documentElement.lang ?? "en",
      };
    });

    const externalCssUrls = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((el) => (el as HTMLLinkElement).href)
        .filter(Boolean);
    });

    // CF detection doesn't apply to vibepreview.com (GHL's own infrastructure).
    const cfIndicators = [
      "cf-error-details",
      "cf-wrapper",
      "Sorry, you have been blocked",
      "has sido bloqueado",
      "Attention Required! | Cloudflare",
      "Just a moment...",
      "Enable JavaScript and cookies to continue",
    ];
    const isCfBlock =
      !isVibe && cfIndicators.some((indicator) => html.includes(indicator));

    // Also detect CF even on vibepreview.com (it turns out they DO have CF too)
    const isCfBlockVibe =
      isVibe && cfIndicators.some((indicator) => html.includes(indicator));

    await browser.close();

    if (isCfBlock || isCfBlockVibe) {
      throw new Error(`Cloudflare bloqueó ${engine} en ${pageUrl}`);
    }

    const assets: RawAsset[] = collectedResources.map((r) => ({
      url: r.url,
      type: r.type === "stylesheet" ? "css" : r.type === "media" ? "video" : r.type === "script" ? "js" : (r.type as RawAsset["type"]),
      content: r.content,
      mimeType: r.mimeType,
    }));

    return {
      html,
      inlineStyles,
      externalCssUrls,
      assets,
      metadata,
      extractionMethod: engine === "chromium" ? "playwright" : "fetch",
    };
  }

  // CF bypass: FlareSolverr solves the challenge and gives us the clearance cookie.
  // We inject that cookie into a fresh Playwright context so CF lets us through,
  // then do the full scroll extraction (lazy-loaded sections, assets, fonts, etc.).
  private async extractWithCfCookies(
    pageUrl: string,
    cookies: Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: string }>,
    userAgent: string
  ): Promise<ExtractionResult> {
    const { chromium } = await import("playwright-extra");
    const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
    chromium.use(StealthPlugin());

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      locale: "en-US",
      timezoneId: "America/New_York",
    });

    // Inject CF clearance cookies so Cloudflare accepts us
    await context.addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path ?? "/",
        expires: c.expires ?? -1,
        httpOnly: c.httpOnly ?? false,
        secure: c.secure ?? true,
        sameSite: (c.sameSite as "Strict" | "Lax" | "None") ?? "None",
      }))
    );

    const collectedResources: ResourceEntry[] = [];

    await context.route("**/*", async (route) => {
      const request = route.request();
      const resourceType = request.resourceType();
      const url = request.url();

      if (
        url.includes("googletagmanager") ||
        url.includes("google-analytics") ||
        url.includes("facebook.net") ||
        url.includes("hotjar") ||
        url.includes("intercom")
        // NOTE: msgsndr.com scripts intentionally NOT blocked — same reasoning as extractWithEngine.
      ) {
        await route.abort();
        return;
      }

      try {
        const response = await route.fetch();
        const body = await response.body().catch(() => Buffer.alloc(0));
        const responseMime = response.headers()["content-type"] ?? "";
        const isFetchedCss = resourceType === "fetch" && responseMime.startsWith("text/css");
        const effectiveType = isFetchedCss ? "stylesheet" : resourceType;
        if (
          resourceType === "image" || resourceType === "font" || resourceType === "stylesheet" ||
          resourceType === "media" || resourceType === "script" || isFetchedCss
        ) {
          const isMedia = effectiveType === "media";
          const isScript = effectiveType === "script";
          const sizeLimit = isMedia ? 30 * 1024 * 1024 : isScript ? 10 * 1024 * 1024 : Infinity;
          if (body.length <= sizeLimit) {
            collectedResources.push({ url, type: effectiveType, mimeType: responseMime || undefined, content: body });
          }
        }
        await route.fulfill({ response, body });
      } catch {
        await route.continue();
      }
    });

    const page = await context.newPage();
    const isVibe = this.isVibePreview(pageUrl);

    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 180_000 });
    try {
      await page.waitForLoadState("load", { timeout: 30_000 });
    } catch { /* continue */ }
    try {
      await page.waitForLoadState("networkidle", { timeout: 20_000 });
    } catch { /* ok */ }
    await page.waitForTimeout(2000);

    // First scroll pass: viewport-sized steps so every lazy-loaded section gets time to render
    await page.evaluate(async ({ maxMs, stepMs }: { maxMs: number; stepMs: number }) => {
      await new Promise<void>((resolve) => {
        const vh = window.innerHeight || 800;
        let pos = 0;
        const started = Date.now();
        const step = () => {
          if (Date.now() - started >= maxMs) { resolve(); return; }
          pos += Math.floor(vh * 0.85);
          window.scrollTo(0, pos);
          // Delay the height check so dynamic content has time to expand the DOM.
          // Checking before setTimeout would stop early when IntersectionObserver
          // sections grow the page height after being triggered by the scroll.
          setTimeout(() => {
            if (pos >= document.body.scrollHeight) { resolve(); return; }
            step();
          }, stepMs);
        };
        step();
      });
    }, { maxMs: 25_000, stepMs: 350 });

    try {
      await page.waitForLoadState("networkidle", { timeout: 20_000 });
    } catch { /* ok */ }
    await page.waitForTimeout(1500);

    // Second scroll pass — catches sections that loaded during the first pass
    await page.evaluate(async ({ maxMs, stepMs }: { maxMs: number; stepMs: number }) => {
      await new Promise<void>((resolve) => {
        const vh = window.innerHeight || 800;
        let pos = 0;
        const started = Date.now();
        const step = () => {
          if (Date.now() - started >= maxMs) { resolve(); return; }
          pos += Math.floor(vh * 0.85);
          window.scrollTo(0, pos);
          // Delay the height check so dynamic content has time to expand the DOM.
          // Checking before setTimeout would stop early when IntersectionObserver
          // sections grow the page height after being triggered by the scroll.
          setTimeout(() => {
            if (pos >= document.body.scrollHeight) { resolve(); return; }
            step();
          }, stepMs);
        };
        step();
      });
    }, { maxMs: 15_000, stepMs: 300 });

    try {
      await page.waitForLoadState("networkidle", { timeout: 15_000 });
    } catch { /* ok */ }
    await page.waitForTimeout(2000);
    // Same reasoning as extractWithEngine: capture at y=80 so scroll-aware headers
    // are in their solid/visible "scrolled" state, not transparent "at-top" state.
    await page.evaluate(() => window.scrollTo(0, 80));
    await page.waitForTimeout(1000);

    // Force lazy-loaded images and data-bg background images to resolve
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('[data-src]').forEach((el) => {
        const src = el.getAttribute('data-src');
        if (src) { el.setAttribute('src', src); el.removeAttribute('data-src'); }
      });
      document.querySelectorAll<HTMLElement>('[data-lazy-src]').forEach((el) => {
        const src = el.getAttribute('data-lazy-src');
        if (src) { el.setAttribute('src', src); el.removeAttribute('data-lazy-src'); }
      });
      document.querySelectorAll<HTMLElement>('[data-bg]').forEach((el) => {
        const bg = el.getAttribute('data-bg');
        if (bg) { el.style.backgroundImage = `url('${bg}')`; el.removeAttribute('data-bg'); }
      });
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
        img.removeAttribute('loading');
      });
    });

    // Same DOM preparation as extractWithEngine — see detailed comment there.
    await page.evaluate(() => {
      document.querySelectorAll<HTMLElement>('[data-aos]').forEach((el) => {
        el.classList.add('aos-init');
        el.classList.remove('aos-animate');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('visibility');
      });
      document.querySelectorAll<HTMLElement>('.wow, [data-wow-duration]').forEach((el) => {
        el.classList.remove('animated', 'wow-animated');
        el.style.removeProperty('opacity');
        el.style.removeProperty('visibility');
      });
      document.querySelectorAll<HTMLElement>('[data-sal], [data-sr-id]').forEach((el) => {
        el.removeAttribute('data-sal-state');
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('visibility');
      });
      document.querySelectorAll<HTMLElement>('.hl-element-wrapper, [data-element-type]').forEach((el) => {
        if (el.hasAttribute('data-aos') || el.classList.contains('wow') || el.hasAttribute('data-sal')) return;
        const cs = window.getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.1 || cs.visibility === 'hidden') {
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('visibility', 'visible', 'important');
        }
      });
      document.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
        if (el.hasAttribute('data-aos') || el.classList.contains('wow') || el.hasAttribute('data-sal')) return;
        if (el.style.opacity === '0') el.style.removeProperty('opacity');
        if (el.style.visibility === 'hidden' && !el.closest('head')) el.style.removeProperty('visibility');
      });
      document.body.style.setProperty('opacity', '1', 'important');
      document.documentElement.style.setProperty('opacity', '1', 'important');
    });

    const html = await page.evaluate(() => {
      // Same cleanup as extractWithEngine — see detailed comments there.
      document.querySelectorAll(
        "#hl-messenger-frame, .hl-sticky-contact-form-button, " +
        "#hl-chat-widget-container, .hl-chat-widget, " +
        "[id='hl-messenger'], [class='hl-messenger']"
      ).forEach((el) => el.remove());
      document.querySelectorAll("script[src]").forEach((s) => {
        const src = s.getAttribute("src") ?? "";
        if (
          src.includes("googletagmanager") || src.includes("facebook.net") ||
          src.includes("connect.facebook.net") || src.includes("hotjar") ||
          src.includes("form_embed") || src.includes("hl-chat") ||
          src.includes("hl-messenger") || src.includes("msgsndr-chat") ||
          src.includes("gohighlevel.com")
        ) s.remove();
      });
      document.querySelectorAll("script:not([src])").forEach((s) => {
        const t = s.textContent ?? "";
        const isTracking = (t.includes("gtag(") || t.includes("fbq(")) &&
          !t.includes("AOS") && !t.includes("Swiper") && !t.includes("gsap") &&
          !t.includes("addEventListener") && !t.includes("DOMContentLoaded");
        if (isTracking) s.remove();
      });
      return document.documentElement.outerHTML;
    });

    const inlineStyles = await page.evaluate(() => {
      const styles: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try { styles.push(Array.from(sheet.cssRules ?? []).map((r) => r.cssText).join("\n")); } catch { /* cross-origin */ }
      }
      return styles.join("\n");
    });

    const metadata = await page.evaluate(() => {
      const getMeta = (name: string) =>
        document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ??
        document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ?? undefined;
      return {
        title: document.title ?? "",
        description: getMeta("description"),
        ogTitle: getMeta("og:title"),
        ogDescription: getMeta("og:description"),
        ogImage: getMeta("og:image"),
        favicon: (document.querySelector('link[rel="icon"]') as HTMLLinkElement)?.href ?? undefined,
        lang: document.documentElement.lang ?? "en",
      };
    });

    const externalCssUrls = await page.evaluate(() =>
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((el) => (el as HTMLLinkElement).href)
        .filter(Boolean)
    );

    // CF cookies are tied to the IP that solved the challenge — if CF still blocks, throw
    // so the caller falls back to FlareSolverr static HTML instead of deploying a block page.
    const cfIndicators = [
      "Sorry, you have been blocked", "has sido bloqueado",
      "Attention Required! | Cloudflare", "cf-error-details",
      "Just a moment...", "Enable JavaScript and cookies to continue",
    ];
    if (cfIndicators.some((i) => html.includes(i))) {
      await browser.close();
      throw new Error(`CF sigue bloqueando con cookies en ${pageUrl} — usando fallback estático`);
    }

    await browser.close();

    const assets: RawAsset[] = collectedResources.map((r) => ({
      url: r.url,
      type: r.type === "stylesheet" ? "css" : r.type === "media" ? "video" : r.type === "script" ? "js" : (r.type as RawAsset["type"]),
      content: r.content,
      mimeType: r.mimeType,
    }));

    return { html, inlineStyles, externalCssUrls, assets, metadata, extractionMethod: "playwright" };
  }

  // Plain HTTP fetch fallback — used when both Playwright engines are CF-blocked.
  async fetchStatic(pageUrl: string): Promise<ExtractionResult> {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(
        `La URL está protegida por Cloudflare (HTTP ${res.status}). ` +
          `Usa la opción "Pegar HTML" del exportador: abre la página en tu navegador → ` +
          `F12 → Elements → clic derecho en <html> → Copy element → pega el HTML.`
      );
    }

    const html = await res.text();

    const cfIndicators = [
      "cf-error-details",
      "cf-wrapper",
      "Sorry, you have been blocked",
      "has sido bloqueado",
      "Attention Required! | Cloudflare",
      "Just a moment...",
    ];
    if (cfIndicators.some((ind) => html.includes(ind))) {
      throw new Error(
        `Cloudflare Bot Management bloqueó todos los métodos automáticos. ` +
          `Usa la opción "Pegar HTML": abre la página en tu navegador → ` +
          `F12 → Elements → clic derecho en <html> → "Copy" → "Copy element" → pega el HTML en el exportador.`
      );
    }

    const { load } = await import("cheerio");
    const $ = load(html);

    const getMeta = (name: string) =>
      $(`meta[name="${name}"]`).attr("content") ??
      $(`meta[property="${name}"]`).attr("content");

    const metadata = {
      title: $("title").text() || "Untitled",
      description: getMeta("description"),
      ogTitle: getMeta("og:title"),
      ogImage: getMeta("og:image"),
      favicon:
        $('link[rel="icon"]').attr("href") ??
        $('link[rel="shortcut icon"]').attr("href"),
      lang: $("html").attr("lang") ?? "en",
    };

    const externalCssUrls: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) externalCssUrls.push(href.startsWith("http") ? href : new URL(href, pageUrl).href);
    });

    const inlineStyles: string[] = [];
    $("style").each((_, el) => {
      const css = $(el).html();
      if (css?.trim()) inlineStyles.push(css);
    });

    $(
      "script[src*=msgsndr], script[src*=gohighlevel], #hl-messenger-frame, .hl-sticky-contact-form-button"
    ).remove();

    const bodyHtml = $("body").html() ?? html;

    return {
      html: bodyHtml,
      inlineStyles: inlineStyles.join("\n"),
      externalCssUrls,
      assets: [],
      metadata,
      extractionMethod: "fetch",
    };
  }
}

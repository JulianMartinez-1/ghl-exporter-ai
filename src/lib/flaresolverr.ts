import { load } from "cheerio";
import type { ExtractionResult } from "@/modules/extractor/types";

interface FsSolution {
  status: string;
  message?: string;
  solution?: {
    response: string;
    userAgent: string;
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: string;
    }>;
  };
}

export interface CfClearance {
  cookies: FsSolution["solution"] extends undefined ? never : NonNullable<FsSolution["solution"]>["cookies"];
  userAgent: string;
}

export async function getCfClearance(pageUrl: string): Promise<CfClearance> {
  const baseUrl = process.env.FLARESOLVERR_URL ?? "http://localhost:8191";
  const res = await fetch(`${baseUrl}/v1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: "request.get", url: pageUrl, maxTimeout: 120000 }),
  });
  if (!res.ok) throw new Error(`FlareSolverr respondió con HTTP ${res.status}`);
  const data = (await res.json()) as FsSolution;
  if (data.status !== "ok" || !data.solution) {
    throw new Error(`FlareSolverr error: ${data.message ?? "respuesta vacía"}`);
  }
  return {
    cookies: data.solution.cookies,
    userAgent: data.solution.userAgent,
  };
}

export async function fetchWithFlareSolverr(pageUrl: string): Promise<ExtractionResult> {
  const baseUrl = process.env.FLARESOLVERR_URL ?? "http://localhost:8191";

  const res = await fetch(`${baseUrl}/v1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: "request.get", url: pageUrl, maxTimeout: 120000 }),
  });

  if (!res.ok) {
    throw new Error(`FlareSolverr respondió con HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    status: string;
    message?: string;
    solution?: { response: string };
  };

  if (data.status !== "ok" || !data.solution?.response) {
    throw new Error(`FlareSolverr error: ${data.message ?? "respuesta vacía"}`);
  }

  const html = data.solution.response;
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
    if (href) {
      externalCssUrls.push(href.startsWith("http") ? href : new URL(href, pageUrl).href);
    }
  });

  const inlineStyles: string[] = [];
  $("style").each((_, el) => {
    const css = $(el).html();
    if (css?.trim()) inlineStyles.push(css);
  });

  $(
    "script[src*=msgsndr], script[src*=gohighlevel], #hl-messenger-frame, .hl-sticky-contact-form-button"
  ).remove();

  return {
    html: $("body").html() ?? html,
    inlineStyles: inlineStyles.join("\n"),
    externalCssUrls,
    assets: [],
    metadata,
    extractionMethod: "fetch",
  };
}

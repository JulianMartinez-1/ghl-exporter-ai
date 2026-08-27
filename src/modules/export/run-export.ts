import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { WebsiteCrawler } from "@/modules/extractor/website-crawler";
import { PageConverter } from "@/modules/converter";
import { GitHubService } from "@/modules/github";
import { ExportLogger } from "./logger";
import type { ExportJobData, ExtractedPage, GeneratedProject } from "@/types";

const OUTPUT_DIR = process.env.EXPORT_OUTPUT_DIR
  ? path.resolve(process.env.EXPORT_OUTPUT_DIR)
  : path.resolve(process.cwd(), "data", "exports");

const CRAWL_MAX_PAGES = Number(process.env.CRAWL_MAX_PAGES ?? 60);

/**
 * The whole pipeline: crawl (or use pasted HTML) → convert to a static site →
 * zip it locally for download → push it to a new GitHub repo. No queue, no
 * Vercel, no GHL OAuth — called directly from the API route via
 * `unstable_after()` so it keeps running after the HTTP response is sent.
 */
export async function runExport(data: ExportJobData): Promise<void> {
  const { exportId, url, rawHtml } = data;
  const logger = new ExportLogger(exportId);

  const updateStatus = async (
    status: string,
    progress: number,
    extra?: Record<string, unknown>
  ) => {
    await prisma.export.update({
      where: { id: exportId },
      data: { status: status as never, progress, ...extra },
    });
  };

  try {
    await updateStatus("EXTRACTING", 5, { startedAt: new Date() });
    await logger.info(`Iniciando clonado de: ${url}`);

    const exportRecord = await prisma.export.findUniqueOrThrow({ where: { id: exportId } });
    const converter = new PageConverter();

    let project: GeneratedProject;
    let pagesCount: number;
    let extractionMethod: "PLAYWRIGHT" | "FETCH" | "HTML_PASTED" | "HYBRID";

    const pastedHtml = (exportRecord.rawHtml ?? rawHtml ?? "").trim();

    if (pastedHtml.length > 100) {
      // ── Fallback: el usuario pegó el HTML a mano (p. ej. porque el crawl falló) ──
      await logger.info("HTML proporcionado manualmente — procesando página única...");
      await updateStatus("EXTRACTING", 20);

      const { load } = await import("cheerio");
      const $ = load(pastedHtml);
      const getMeta = (name: string) =>
        $(`meta[name="${name}"]`).attr("content") ?? $(`meta[property="${name}"]`).attr("content");

      const externalCssUrls: string[] = [];
      $('link[rel="stylesheet"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        if (href.startsWith("http") || href.startsWith("//")) {
          externalCssUrls.push(href.startsWith("//") ? `https:${href}` : href);
        } else {
          try {
            externalCssUrls.push(new URL(href, url).href);
          } catch {
            /* ignore malformed */
          }
        }
      });

      const extracted: ExtractedPage = {
        html: pastedHtml,
        css: [$("style").toArray().map((el) => $(el).html() ?? "").join("\n")],
        externalCssUrls,
        scripts: [],
        images: [],
        fonts: [],
        videos: [],
        metadata: {
          title: $("title").text() || exportRecord.name,
          description: getMeta("description"),
          ogTitle: getMeta("og:title"),
          ogImage: getMeta("og:image"),
          lang: $("html").attr("lang") ?? "es",
        },
        components: [],
        method: "html-pasted",
      };

      await updateStatus("CONVERTING", 40);
      project = await converter.convert(extracted, exportRecord.name, async (msg) => {
        await logger.info(msg);
      });
      pagesCount = 1;
      extractionMethod = "HTML_PASTED";
    } else {
      // ── Camino normal: rastrear el sitio/funnel completo desde la URL pegada ──
      await logger.info(`Rastreando el sitio completo desde: ${url}`);

      const crawler = new WebsiteCrawler();
      const site = await crawler.crawl(url, CRAWL_MAX_PAGES, (msg) => {
        void logger.info(msg);
      });

      await updateStatus("CONVERTING", 40, { pagesCount: site.pages.length });
      await logger.info(`Crawl completado (${site.pages.length} página(s)). Generando sitio estático...`);

      project = await converter.convertSite(site, exportRecord.name, async (msg) => {
        await logger.info(msg);
      });
      pagesCount = site.pages.length;

      const usedFetch = site.pages.some((p) => p.extracted.method === "fetch");
      const usedPlaywright = site.pages.some((p) => p.extracted.method === "playwright");
      extractionMethod = usedPlaywright && usedFetch ? "HYBRID" : usedFetch ? "FETCH" : "PLAYWRIGHT";
    }

    await updateStatus("CONVERTING", 60, { extractionMethod, pagesCount });

    // ── ZIP de respaldo local, para poder descargarlo desde la UI ──────────────
    let zipPath: string | undefined;
    try {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      zip.file("package.json", JSON.stringify(project.packageJson, null, 2));
      for (const file of project.files) {
        if (file.encoding === "base64") {
          zip.file(file.path, file.content, { base64: true });
        } else {
          zip.file(file.path, file.content);
        }
      }
      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      zipPath = path.join(OUTPUT_DIR, `${exportId}.zip`);
      await fs.writeFile(zipPath, buffer);
      await logger.info("ZIP de respaldo generado.");
    } catch (zipErr) {
      const msg = zipErr instanceof Error ? zipErr.message : String(zipErr);
      await logger.warn(`No se pudo generar el ZIP de respaldo (${msg}) — continuando sin él.`);
    }

    await updateStatus("PUSHING_TO_GITHUB", 70, { zipPath });
    await logger.info("Creando repositorio en GitHub...");

    const githubToken = process.env.GITHUB_TOKEN ?? "";
    const githubOwnerEnv = process.env.GITHUB_ORG ?? "";
    if (!githubToken) {
      throw new Error("Falta configurar GITHUB_TOKEN en el servidor — no se puede crear el repositorio.");
    }

    const github = new GitHubService(githubToken, githubOwnerEnv);
    const repoName = await github.ensureRepoName(project.name);
    const repo = await github.createRepository(
      repoName,
      `Clonado desde GoHighLevel (${url}) — GHL Exporter AI`
    );

    await updateStatus("PUSHING_TO_GITHUB", 85);
    await logger.info(`Repositorio creado: ${repo.url}. Enviando archivos...`);

    const allFilesForGithub = [
      { path: "package.json", content: JSON.stringify(project.packageJson, null, 2) },
      ...project.files,
    ];
    await github.pushFiles(repo.owner, repo.name, allFilesForGithub, undefined, async (msg) => {
      await logger.info(msg);
    });

    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: "COMPLETED",
        progress: 100,
        githubRepoUrl: repo.url,
        githubRepoName: repo.fullName,
        completedAt: new Date(),
      },
    });

    await logger.info(`✓ Clonado completo. Repositorio: ${repo.url}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logger.error(`Error fatal: ${message}`);
    await prisma.export.update({
      where: { id: exportId },
      data: { status: "FAILED", errorMessage: message },
    });
    // No relanzamos — esto corre en segundo plano vía unstable_after(), no hay
    // ninguna respuesta HTTP esperando el resultado.
  }
}

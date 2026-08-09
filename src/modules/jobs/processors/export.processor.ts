import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/utils";
import { GhlApiClient, GhlFunnelsService, GhlWebsitesService } from "@/modules/gohighlevel";
import { ExtractionOrchestrator } from "@/modules/extractor";
import { WebsiteCrawler } from "@/modules/extractor/website-crawler";
import { PageConverter } from "@/modules/converter";
import { GitHubService } from "@/modules/github";
import { VercelService } from "@/modules/vercel";
import { SupabaseStorageService } from "@/modules/storage";
import { ExportLogger } from "@/modules/logs";
import type { ExportJobData } from "@/types";
import type { Job } from "bullmq";

// Core processing logic — no BullMQ dependency.
// Called by the BullMQ worker wrapper AND directly from the API route via after().
export async function runExport(
  data: ExportJobData,
  onProgress?: (progress: number) => Promise<void>
): Promise<void> {
  const { exportId, connectionId, sourceType, sourceId, pageId, pageUrl, rawHtml } = data;
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
    await onProgress?.(progress);
  };

  try {
    await updateStatus("EXTRACTING", 5);
    await logger.info("Iniciando proceso de exportación...");

    // Load connection & decrypt tokens
    const connection = await prisma.ghlConnection.findUniqueOrThrow({
      where: { id: connectionId },
    });

    const accessToken = decrypt(connection.accessToken);
    const client = new GhlApiClient(accessToken, connection.locationId);

    const converter = new PageConverter();
    const exportRecord = await prisma.export.findUniqueOrThrow({ where: { id: exportId } });
    const projectName = `ghl-${exportRecord.pageName ?? exportRecord.sourceName}`;
    let projectRepoName = projectName;

    let project: import("@/types").GeneratedProject;

    // ── URL-direct: puede ser crawl por URL o página única por HTML pegado ─────
    if (sourceId === "url-direct") {
      const pastedHtml = (exportRecord.rawHtml ?? rawHtml ?? "").trim();

      if (pastedHtml.length > 100) {
        // ── Paste-HTML path (sin URL — el usuario pegó el HTML directamente) ──
        await logger.info("HTML proporcionado manualmente — procesando página única...");
        await updateStatus("EXTRACTING", 15);

        const { load } = await import("cheerio");
        const $ = load(pastedHtml);
        const getMeta = (name: string) =>
          $(`meta[name="${name}"]`).attr("content") ??
          $(`meta[property="${name}"]`).attr("content");

        // Collect ALL stylesheet hrefs — both absolute and relative
        // The converter will fetch them server-side when method="api"
        const pasteBaseUrl = exportRecord.pageUrl ?? "";
        const externalCssUrls: string[] = [];
        $('link[rel="stylesheet"]').each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;
          if (href.startsWith("http") || href.startsWith("//")) {
            externalCssUrls.push(href.startsWith("//") ? `https:${href}` : href);
          } else if (pasteBaseUrl) {
            // Resolve relative URL using the page URL if available
            try {
              externalCssUrls.push(new URL(href, pasteBaseUrl).href);
            } catch { /* ignore malformed */ }
          }
        });

        const extractedFromHtml: import("@/types").ExtractedPage = {
          // Pass the full HTML (not just body) so the converter can extract
          // the <head> content (CDN CSS links, meta tags, inline styles).
          html: pastedHtml,
          css: [$("style").toArray().map((el) => $(el).html() ?? "").join("\n")],
          externalCssUrls,
          scripts: [],
          images: [],
          fonts: [],
          videos: [],
          metadata: {
            title: $("title").text() || exportRecord.pageName || exportRecord.sourceName || "Untitled",
            description: getMeta("description"),
            ogTitle: getMeta("og:title"),
            ogImage: getMeta("og:image"),
            lang: $("html").attr("lang") ?? "en",
          },
          components: [],
          method: "api",
        };

        await updateStatus("CONVERTING", 40, { extractionMethod: "API" as never });
        await logger.info("HTML procesado. Generando sitio estático...");

        project = await converter.convert(extractedFromHtml, projectName, async (msg) => {
          await logger.info(msg);
        });

      } else if (exportRecord.pageUrl) {
        // ── URL crawl path ────────────────────────────────────────────────────
        await logger.info(`Iniciando crawl del sitio completo desde: ${exportRecord.pageUrl}`);
        await updateStatus("EXTRACTING", 10);

        const crawler = new WebsiteCrawler();
        const site = await crawler.crawl(
          exportRecord.pageUrl,
          25,
          async (msg) => { await logger.info(msg); }
        );

        await updateStatus("CONVERTING", 40, { extractionMethod: "PLAYWRIGHT" as never });
        await logger.info(`Crawl completado (${site.pages.length} páginas). Generando sitio estático...`);

        project = await converter.convertSite(site, projectName, async (msg) => {
          await logger.info(msg);
        });

      } else {
        throw new Error(
          "Esta exportación no tiene URL ni HTML para procesar. " +
          "Usa el botón \"Reintentar con HTML\" para proporcionar el contenido de la página manualmente."
        );
      }

    // ── GHL funnel/website: single-page extraction (API → Playwright) ────────
    } else {
      await logger.info("Obteniendo información de la página desde la API...");
      let found: import("@/types").GhlPage | undefined;
      if (sourceType === "FUNNEL") {
        const svc = new GhlFunnelsService(client);
        const pages = await svc.getFunnelPages(sourceId, connection.locationId);
        found = pages.find((p) => p.id === pageId);
      } else {
        const svc = new GhlWebsitesService(client);
        const pages = await svc.getWebsitePages(sourceId, connection.locationId);
        found = pages.find((p) => p.id === pageId);
      }
      if (!found) throw new Error(`Página ${pageId} no encontrada.`);
      const page = found;

      await updateStatus("EXTRACTING", 15);

      let extracted: import("@/types").ExtractedPage;

      if (rawHtml && rawHtml.trim().length > 100) {
        await logger.info("HTML proporcionado manualmente — omitiendo extracción automática.");
        const { load } = await import("cheerio");
        const $ = load(rawHtml);
        const getMeta = (name: string) =>
          $(`meta[name="${name}"]`).attr("content") ??
          $(`meta[property="${name}"]`).attr("content");

        // Collect ALL external CSS URLs — both absolute and relative (resolved via page URL)
        const rawHtmlBaseUrl = pageUrl ?? page.url ?? page.previewUrl ?? "";
        const externalCssUrls: string[] = [];
        $('link[rel="stylesheet"]').each((_, el) => {
          const href = $(el).attr("href");
          if (!href) return;
          if (href.startsWith("http") || href.startsWith("//")) {
            externalCssUrls.push(href.startsWith("//") ? `https:${href}` : href);
          } else if (rawHtmlBaseUrl) {
            try { externalCssUrls.push(new URL(href, rawHtmlBaseUrl).href); } catch { /* ignore */ }
          }
        });

        extracted = {
          // Pass the full HTML so the converter preserves the <head> (CDN CSS, meta tags).
          html: rawHtml,
          css: [$("style").toArray().map((el) => $(el).html() ?? "").join("\n")],
          externalCssUrls,
          scripts: [],
          images: [],
          fonts: [],
          videos: [],
          metadata: {
            title: $("title").text() || page.name,
            description: getMeta("description"),
            ogTitle: getMeta("og:title"),
            ogImage: getMeta("og:image"),
            lang: $("html").attr("lang") ?? "en",
          },
          components: [],
          method: "api",
        };
      } else {
        await logger.info("Iniciando extractor (API → Playwright → fetch fallback)...");
        const orchestrator = new ExtractionOrchestrator();
        extracted = await orchestrator.extract(
          page,
          {
            pageUrl: pageUrl ?? page.previewUrl ?? page.url ?? "",
            pageId,
            locationId: connection.locationId,
            accessToken,
            sourceName: page.name,
          },
          async (msg) => { await logger.info(msg); }
        );
      }

      await updateStatus("CONVERTING", 40, {
        extractionMethod: extracted.method.toUpperCase() as never,
      });
      await logger.info(`Extracción completada via ${extracted.method}. Generando sitio estático...`);

      project = await converter.convert(extracted, projectName, async (msg) => {
        await logger.info(msg);
      });
    }

    projectRepoName = project.name;

    await updateStatus("CONVERTING", 60);

    // Upload to Supabase Storage (optional backup — never blocks the main flow)
    let storageUrl: string | undefined;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      if (supabaseUrl && !supabaseUrl.includes("your-project") && supabaseKey && supabaseKey !== "your-service-role-key") {
        await logger.info("Subiendo proyecto a Supabase Storage...");
        const storage = new SupabaseStorageService();
        await storage.ensureBucketExists();
        storageUrl = await storage.uploadProject(exportId, project);
        await logger.info("Proyecto zip guardado en Supabase.");
      } else {
        await logger.info("Supabase no configurado — omitiendo backup de zip.");
      }
    } catch (storageErr) {
      const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
      await logger.info(`Backup de Supabase falló (${msg}) — continuando sin zip.`);
    }

    await updateStatus("PUSHING_TO_GITHUB", 65, { storageUrl });
    await logger.info("Creando repositorio en GitHub...");

    // GitHub — non-blocking: a timeout here should not prevent the Vercel deployment.
    const githubToken = process.env.GITHUB_TOKEN ?? "";
    const githubOwner = process.env.GITHUB_ORG ?? "";
    let repoName = projectRepoName;
    let githubRepoUrl: string | undefined;
    let githubRepoFullName: string | undefined;

    try {
      const github = new GitHubService(githubToken, githubOwner);
      repoName = await github.ensureRepoName(projectRepoName);

      const repo = await github.createRepository(
        repoName,
        `Exportado desde GHL por GHL Exporter AI — ${exportRecord.sourceName ?? exportRecord.pageName ?? projectRepoName}`
      );
      githubRepoUrl = repo.url;
      githubRepoFullName = repo.fullName;

      await updateStatus("PUSHING_TO_GITHUB", 70);
      await logger.info(`Repositorio creado: ${repo.url}. Enviando archivos...`);

      const allFilesForGithub: import("@/types").GeneratedFile[] = [
        { path: "package.json", content: JSON.stringify(project.packageJson, null, 2) },
        ...project.files,
      ];
      await github.pushFiles(repoName, allFilesForGithub, undefined, async (msg) => {
        await logger.info(msg);
      });

      await prisma.export.update({
        where: { id: exportId },
        data: { githubRepoUrl, githubRepoName: githubRepoFullName },
      });
      await logger.info("Push a GitHub completado.");
    } catch (ghErr) {
      const msg = ghErr instanceof Error ? ghErr.message : String(ghErr);
      await logger.info(`GitHub falló (${msg}) — continuando con deploy en Vercel...`);
    }

    await updateStatus("DEPLOYING", 80);
    await logger.info("Desplegando en Vercel...");

    // Vercel — deploy files directly, no GitHub→Vercel connection required
    const vercel = new VercelService(
      process.env.VERCEL_TOKEN ?? "",
      process.env.VERCEL_TEAM_ID
    );

    const deploymentId = await vercel.deployFiles(repoName, project.files, project.packageJson);

    await updateStatus("DEPLOYING", 85, { vercelDeployId: deploymentId });
    await logger.info(`Deploy iniciado (${deploymentId}). Esperando finalización...`);

    const deploy = await vercel.waitForDeployment(deploymentId, async (state) => {
      await logger.info(`Estado deploy: ${state}`);
    });

    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: "COMPLETED",
        progress: 100,
        vercelProjectId: deploy.projectId,
        vercelDeployUrl: deploy.url,
        vercelDeployId: deploymentId,
        completedAt: new Date(),
      },
    });

    await logger.info(`✓ Exportación completada. URL: ${deploy.url}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logger.error(`Error fatal: ${message}`);
    await prisma.export.update({
      where: { id: exportId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw err;
  }
}

// BullMQ worker wrapper — used only when running `npm run worker` with Redis.
export async function processExport(job: Job<ExportJobData>): Promise<void> {
  return runExport(job.data, async (progress) => {
    await job.updateProgress(progress);
  });
}

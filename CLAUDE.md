# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does

Single-purpose internal tool: paste a public GoHighLevel Funnel/Website URL →
it gets crawled and cloned 1:1 into a static site → pushed to a new GitHub
repo. No auth, no dashboard, no GHL OAuth connection, no Vercel deploy. The
resulting repo is meant to be hosted on Hostinger (or any static host).

## Commands

```bash
npm run dev          # Start Next.js dev server (Turbopack) — single process, no worker
npm run build        # Production build
npm run lint         # ESLint

npm run db:push      # Push schema changes to DB without a migration file
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Create and apply a named migration
npm run db:studio    # Open Prisma Studio GUI
```

**Single-process architecture.** There is no queue/worker. `POST /api/exports`
creates the `Export` row and calls `after()` (from `next/server`) to run the
pipeline after the HTTP response is sent, in the same Next.js process. The UI
polls `GET /api/exports/[id]` for status/progress/logs.

## Architecture

### Stack
Next.js 15 (App Router, TypeScript, Tailwind), Prisma + PostgreSQL (only for
`Export`/`ExportLog` history), Octokit (GitHub), Playwright + Cheerio for
crawling/extraction, JSZip for the local backup download.

### Module layout (`src/modules/`)
| Module | Responsibility |
|---|---|
| `extractor/` | `WebsiteCrawler` — crawls a site/funnel from a public URL (same-origin links, up to `CRAWL_MAX_PAGES`), using `PlaywrightExtractor` per page and `ResourceNormalizer` for assets |
| `converter/` | `PageConverter` — takes a `CrawledSite` (or a single `ExtractedPage` for the pasted-HTML fallback) and produces a `GeneratedProject`: plain static HTML/CSS/JS files, no build step |
| `github/` | `GitHubService` — creates the repo (tries `createInOrg` when `GITHUB_ORG` is set, falls back to the authenticated user's personal account) and pushes files via the Git Data API in batches of 20 |
| `export/` | `run-export.ts` (`runExport()` — the whole pipeline) + `ExportLogger` (writes `ExportLog` rows polled by the UI) |

### Export pipeline (`src/modules/export/run-export.ts`)
`runExport()` is called directly from the API route via `after()` — no queue:

1. If the `Export` row has pasted HTML (manual fallback, e.g. after a failed
   crawl): parse with Cheerio, convert as a single page.
2. Otherwise: `WebsiteCrawler.crawl(url, CRAWL_MAX_PAGES)` — crawls the whole
   site/funnel, same-origin only.
3. `PageConverter.convert()` / `convertSite()` → `GeneratedProject`.
4. Build a ZIP locally with JSZip, save to `EXPORT_OUTPUT_DIR` (default
   `./data/exports/<id>.zip`) — downloadable from the UI.
5. `GitHubService`: `ensureRepoName()` (avoids collisions) → `createRepository()`
   → `pushFiles()`.
6. Update `Export.status` at each step (EXTRACTING → CONVERTING →
   PUSHING_TO_GITHUB → COMPLETED/FAILED).

### Routes
All public, no middleware:
- `POST /api/exports` — create + kick off a run
- `GET /api/exports` — history (last 50)
- `GET /api/exports/[id]` — status, progress, logs
- `GET /api/exports/[id]/download` — the local ZIP
- `POST /api/exports/[id]/retry` — retry a FAILED export with manually pasted HTML

### Database models (Prisma)
- `Export` — one row per clone job: `url`, `name` (repo slug), `status`,
  `progress`, `extractionMethod`, `pagesCount`, `githubRepoUrl`/`githubRepoName`,
  `zipPath`, `errorMessage`, timestamps. `rawHtml` holds manually-pasted HTML
  (either the initial submission or a retry after a failed crawl).
- `ExportLog` — append-only log rows per export, polled by the UI.

### Key env vars
`DATABASE_URL`, `DIRECT_URL` (Prisma), `GITHUB_TOKEN`, `GITHUB_ORG` (optional
— empty means personal account), `EXPORT_OUTPUT_DIR`, `CRAWL_MAX_PAGES`.

### What was intentionally removed
Clerk auth, the multi-tenant dashboard, GoHighLevel OAuth + API browsing
(Funnel/Website picker), Vercel deploy, Supabase Storage, BullMQ/Redis. See
git history before the "cambio total" rewrite if any of that needs to be
resurrected — the crawler/converter/GitHub pipeline itself is unchanged and
battle-tested against real GHL sites (see the `fix:` commits fixing popups,
WOW.js/SAL animations, and script load order).

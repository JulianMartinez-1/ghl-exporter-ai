# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (Turbopack)
npm run worker       # Start BullMQ export worker — must run in a separate terminal
npm run build        # Production build
npm run lint         # ESLint

npm run db:push      # Push schema changes to DB without a migration file
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Create and apply a named migration
npm run db:studio    # Open Prisma Studio GUI
```

**Two-process architecture:** The Next.js server and the BullMQ worker are separate processes. Exports submitted via the UI stay in PENDING status unless the worker is running. The worker connects to Redis directly and processes jobs from the `exports` queue with concurrency 3.

## Architecture

### Stack
Next.js 15 (App Router, TypeScript, Tailwind), Clerk for auth, Prisma + PostgreSQL, BullMQ + Redis, Supabase Storage, Octokit (GitHub), Vercel API, Playwright for headless rendering.

### Module layout (`src/modules/`)
| Module | Responsibility |
|---|---|
| `gohighlevel/` | GHL API client (`GhlApiClient`), OAuth service, funnels/websites/media services |
| `extractor/` | `ExtractionOrchestrator` — tries API metadata first, falls back to Playwright; `WebsiteCrawler` for full-site crawls |
| `converter/` | `PageConverter` — takes an `ExtractedPage` and produces a `GeneratedProject` (static HTML/CSS files); `ComponentDetector` classifies page sections |
| `github/` | `GitHubService` — creates repos and pushes files via Git Data API in batches of 20 |
| `vercel/` | `VercelService` — deploys files directly without a GitHub↔Vercel connection |
| `storage/` | `SupabaseStorageService` — uploads a ZIP of the generated project as a backup |
| `jobs/` | BullMQ queue definition, worker entry point, `export.processor.ts` |
| `logs/` | `ExportLogger` — writes `ExportLog` rows to DB per export |
| `auth/` | Clerk webhook helpers for user sync |

### Export pipeline (`src/modules/jobs/processors/export.processor.ts`)
`runExport()` is the core function — called by both the BullMQ worker wrapper and directly from the API via Next.js `unstable_after()` as a Redis-less fallback:

1. Load `GhlConnection` from DB, decrypt access token
2. **Extraction** — three paths depending on the request:
   - **Pasted HTML** (`rawHtml` provided): parse with Cheerio, no network calls
   - **URL crawl** (`sourceId === "url-direct"` + `pageUrl`): `WebsiteCrawler` with Playwright, up to 25 pages
   - **GHL API → Playwright**: fetch page metadata from GHL, try API extraction, fall back to headless rendering
3. **Conversion**: `PageConverter.convert()` or `convertSite()` → `GeneratedProject`
4. **Supabase upload** (optional, non-blocking — skipped if env vars are placeholders)
5. **GitHub**: create repo via `ensureRepoName()` (avoids collisions), push all files in batches
6. **Vercel**: deploy files directly, poll until deployment is ready
7. Update `Export` record status at each step (EXTRACTING → CONVERTING → PUSHING_TO_GITHUB → DEPLOYING → COMPLETED/FAILED)

### Auth & protected routes
Clerk middleware in `src/middleware.ts` protects `/dashboard/**`, `/exports/**`, `/deploys/**`, `/repositories/**`, `/settings/**`, `/logs/**`. All other routes (including the landing page and GHL OAuth callback) are public.

### GHL OAuth flow
`/api/ghl/oauth` → redirects to GHL marketplace → `/api/ghl/oauth/callback` stores encrypted `accessToken`/`refreshToken` in `GhlConnection`. The GHL API base is `https://services.leadconnectorhq.com` with version header `2021-07-28`.

### Database models (Prisma)
- `User` — synced from Clerk via webhook
- `GhlConnection` — one per GHL location; tokens stored encrypted
- `Export` — tracks a single page/site export with its status, progress %, and output URLs
- `ExportLog` — append-only log rows per export (shown in real-time in the UI)
- `ApiKey` — hashed API keys for programmatic access

### Key env vars
`DATABASE_URL`, `DIRECT_URL` (Prisma), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `REDIS_URL`, `GITHUB_TOKEN`, `GITHUB_ORG`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY` (token encryption).

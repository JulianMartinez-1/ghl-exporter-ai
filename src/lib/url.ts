const GHL_APP_HOSTS = [
  "app.go-to-marketing.com",
  "app.gohighlevel.com",
  "app.leadconnectorhq.com",
];

export interface GhlAppUrlParts {
  locationId: string;
  projectId: string;
}

/**
 * Parses a GHL editor URL for Vibe/AI projects.
 * Returns { locationId, projectId } or null if the URL is not a Vibe project URL.
 * Pattern: /v2/location/{locationId}/vibe/projects/{projectId}
 */
export function parseGhlAppUrl(value: string): GhlAppUrlParts | null {
  try {
    const url = new URL(value);
    if (!GHL_APP_HOSTS.some((h) => url.hostname === h)) return null;
    const match = url.pathname.match(/\/v2\/location\/([^/]+)\/vibe\/projects\/([^/?#]+)/);
    if (!match) return null;
    return { locationId: match[1], projectId: match[2] };
  } catch {
    return null;
  }
}

/**
 * Returns true for any GHL dashboard/editor URL (requires authentication).
 * These look like public URLs but are not — Playwright will get redirected to login.
 */
export function isGhlAppUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return GHL_APP_HOSTS.some((h) => url.hostname === h);
  } catch {
    return false;
  }
}

export function deriveNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname
      .replace(/^www\./, "")
      .replace(/\.vibepreview\.com$/, "")
      .replace(/\.[^.]+$/, "")
      .replace(/\./g, "-");
    const path = parsed.pathname
      .replace(/\//g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
    const combined = path ? `${host}-${path}` : host;
    return (
      combined
        .replace(/[^a-z0-9-]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "pagina-exportada"
    );
  } catch {
    return "pagina-exportada";
  }
}

export function normalizeWebUrlInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : trimmed.startsWith("//")
        ? `https:${trimmed}`
        : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    // Reject bare words without a TLD (e.g. "soybeya" → "https://soybeya/" is not a real URL)
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
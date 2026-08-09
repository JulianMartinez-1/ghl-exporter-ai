import type { PageMetadata } from "@/types";

/**
 * Generates the root layout for the exported Next.js project.
 *
 * ALL CSS is injected as a <style dangerouslySetInnerHTML> tag so it NEVER
 * goes through Turbopack's CSS pipeline. This avoids BUILD_UTILS_SPAWN_1 errors
 * caused by @charset, @import, or non-standard CSS that Turbopack rejects.
 *
 * External CSS URLs become <link rel="stylesheet"> tags (browser-handled).
 * globals.css is intentionally empty — only kept so the import doesn't error.
 */
export function generateRootLayout(
  metadata: PageMetadata,
  _fonts: string[],
  _headHtml = "",
  externalCssUrls: string[] = [],
  inlineCss = ""
): string {
  const uniqueExternalUrls = [...new Set(externalCssUrls.filter((u) => u.startsWith("http")))];
  // ghl-styles.css is always generated (inline CSS + animation resets).
  const allLinks = [
    "/ghl-styles.css",
    ...uniqueExternalUrls,
  ];
  // React 19 hoists <link> tags to <head> automatically — no explicit <head> needed.
  const linkTags = allLinks
    .map((url) => `        <link rel="stylesheet" href=${JSON.stringify(url)} />`)
    .join("\n");

  return `import "./globals.css";

export const metadata = {
  title: ${JSON.stringify(metadata.title || "")},
  description: ${JSON.stringify(metadata.description ?? "")},
  openGraph: {
    title: ${JSON.stringify(metadata.ogTitle ?? metadata.title ?? "")},
    description: ${JSON.stringify(metadata.description ?? "")},
    images: ${JSON.stringify(metadata.ogImage ? [{ url: metadata.ogImage }] : [])},
  },
  icons: {
    icon: ${JSON.stringify(metadata.favicon ?? "/favicon.ico")},
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="${metadata.lang ?? "en"}">
      <head>
${linkTags}
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
`;
}

/**
 * globals.css is intentionally minimal — all real CSS is injected via
 * <style dangerouslySetInnerHTML> in layout.tsx to bypass Turbopack parsing.
 */
export function generateGlobalsCss(
  _inlineStyles: string[] = [],
  _externalCssUrls: string[] = []
): string {
  return `/* GHL Exporter — styles injected via layout.tsx */\n`;
}

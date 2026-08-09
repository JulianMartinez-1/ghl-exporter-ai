import type { DetectedComponent, ComponentType } from "@/types";
import { getComponentName } from "./components.generator";

export function generatePageFile(
  components: DetectedComponent[],
  pageTitle: string,
  rawHtml?: string,
  externalScripts: string[] = [],
  inlineScripts: string[] = []
): string {
  const documentHtml = rawHtml ?? "";
  const hasScripts = externalScripts.length > 0 || inlineScripts.length > 0;

  if (documentHtml) {
    if (hasScripts) {
      return `/* eslint-disable */
"use client";
import { useEffect } from "react";

const __html = ${JSON.stringify(documentHtml)};
const __ext = ${JSON.stringify(externalScripts)};
const __inline = ${JSON.stringify(inlineScripts)};

function ScriptLoader() {
  useEffect(() => {
    const added = [];
    (async () => {
      for (const src of __ext) {
        const s = document.createElement("script");
        s.src = src;
        s.async = false;
        document.body.appendChild(s);
        added.push(s);
        await new Promise(r => { s.onload = r; s.onerror = r; });
      }
      for (const code of __inline) {
        const s = document.createElement("script");
        s.textContent = code;
        document.body.appendChild(s);
        added.push(s);
      }
    })();
    return () => added.forEach(s => s.remove());
  }, []);
  return null;
}

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html }} />
      <ScriptLoader />
    </>
  );
}
`;
    }

    return `/* eslint-disable */
export default function Page() {
  return <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(documentHtml)} }} />;
}
`;
  }

  if (components.length === 0) {
    return `/* eslint-disable */
export default function Page() {
  return <main><h1>${pageTitle}</h1></main>;
}
`;
  }

  const usedNames = new Set<ComponentType>();
  const uniqueComponents = components.filter((c) => {
    if (usedNames.has(c.type)) return false;
    usedNames.add(c.type);
    return true;
  });

  const imports = uniqueComponents
    .map((c) => `import ${getComponentName(c.type)} from "@/components/${getComponentName(c.type)}";`)
    .join("\n");

  const jsxElements = uniqueComponents
    .map((c) => `      <${getComponentName(c.type)} />`)
    .join("\n");

  return `/* eslint-disable */
${imports}

export default function Page() {
  return (
    <main>
${jsxElements}
    </main>
  );
}
`;
}

/**
 * Generates a Next.js Route Handler that serves the full HTML as a raw HTTP response.
 *
 * This bypasses React entirely so:
 * - Scripts execute in proper document lifecycle (DOMContentLoaded, load events fire correctly)
 * - Animations, sliders, accordions, tabs — all interactive JS works
 * - No hydration mismatch issues
 * - No dangerouslySetInnerHTML script execution limitation
 */
export function generateRouteHandler(fullHtml: string): string {
  return `/* eslint-disable */
const HTML = ${JSON.stringify(fullHtml)};

export async function GET() {
  return new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
`;
}

export function generateNextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
`;
}


export function generateVercelJson(): string {
  return JSON.stringify(
    {
      version: 2,
      // No framework, buildCommand, or installCommand fields — Vercel treats this as a
      // fully-static deployment and serves files directly from the upload root.
      cleanUrls: true,
      trailingSlash: false,
      headers: [
        {
          source: "/ghl-styles.css",
          headers: [
            { key: "Content-Type", value: "text/css; charset=utf-8" },
            { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          ],
        },
        {
          source: "/assets/(.*)",
          headers: [
            { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            { key: "Access-Control-Allow-Origin", value: "*" },
          ],
        },
      ],
    },
    null,
    2
  );
}

export function generateExportedPackageJson(projectName: string): Record<string, unknown> {
  // No dependencies, no scripts. Vercel serves the uploaded files as static assets.
  return {
    name: projectName,
    version: "0.1.0",
    private: true,
  };
}

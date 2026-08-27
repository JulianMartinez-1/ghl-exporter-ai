export function generateExportedReadme(projectName: string, pagesCount: number): string {
  return `# ${projectName}

Sitio estático clonado 1:1 desde GoHighLevel con **GHL Exporter AI**.

- Páginas: ${pagesCount}
- No requiere build ni dependencias — es HTML/CSS/JS puro.
- \`index.html\` es la página de inicio; el resto de páginas replican la ruta original del sitio.

## Cómo hostearlo

Cualquier hosting de archivos estáticos sirve. Para **Hostinger** (u otro hosting compartido):

1. Sube el contenido de este repositorio a \`public_html/\` (o la carpeta pública del dominio/subdominio).
2. Listo — no hay paso de build ni variables de entorno que configurar.

También funciona igual en Netlify, Cloudflare Pages, GitHub Pages, o un simple \`npx serve .\` en local.
`;
}

export function generateExportedPackageJson(projectName: string): Record<string, unknown> {
  // No dependencies, no scripts. Vercel serves the uploaded files as static assets.
  return {
    name: projectName,
    version: "0.1.0",
    private: true,
  };
}

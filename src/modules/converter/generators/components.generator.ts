import type { DetectedComponent, ComponentType } from "@/types";

export function generateComponentFile(
  component: DetectedComponent,
  componentName: string
): string {
  // Use dangerouslySetInnerHTML to inject raw HTML — avoids all JSX conversion
  // issues (syntax errors, invalid attributes, multiple roots, etc.)
  const cleanedHtml = component.html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const htmlJson = JSON.stringify(cleanedHtml);

  return `/* eslint-disable */
export default function ${componentName}() {
  return <div dangerouslySetInnerHTML={{ __html: ${htmlJson} }} />;
}
`;
}

export function getComponentName(type: ComponentType): string {
  const names: Record<ComponentType, string> = {
    navbar: "Navbar",
    hero: "Hero",
    about: "About",
    gallery: "Gallery",
    pricing: "Pricing",
    services: "Services",
    faq: "FAQ",
    testimonials: "Testimonials",
    contact: "Contact",
    cta: "CTA",
    footer: "Footer",
    generic: "Section",
  };
  return names[type] ?? "Section";
}

export function getComponentPath(type: ComponentType): string {
  return `src/components/${getComponentName(type)}.jsx`;
}

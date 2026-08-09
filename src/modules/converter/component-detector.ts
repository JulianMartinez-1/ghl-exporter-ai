import { load } from "cheerio";
import type { DetectedComponent, ComponentType } from "@/types";

const COMPONENT_PATTERNS: Array<{
  type: ComponentType;
  selectors: string[];
  keywords: string[];
}> = [
  {
    type: "navbar",
    selectors: ["nav", "header", '[class*="nav"]', '[class*="header"]', '[class*="menu"]'],
    keywords: ["nav", "menu", "header", "navigation"],
  },
  {
    type: "hero",
    selectors: ['[class*="hero"]', '[class*="banner"]', '[class*="jumbotron"]', "section:first-of-type"],
    keywords: ["hero", "banner", "main-section", "headline"],
  },
  {
    type: "pricing",
    selectors: ['[class*="pric"]', '[class*="plan"]', '[class*="package"]'],
    keywords: ["pricing", "price", "plan", "package", "$", "€", "/month", "/year"],
  },
  {
    type: "testimonials",
    selectors: ['[class*="testimonial"]', '[class*="review"]', '[class*="feedback"]'],
    keywords: ["testimonial", "review", "feedback", "said", "customer"],
  },
  {
    type: "faq",
    selectors: ['[class*="faq"]', '[class*="accordion"]', "details", "summary"],
    keywords: ["faq", "frequently", "question", "answer"],
  },
  {
    type: "contact",
    selectors: ['[class*="contact"]', "form", '[class*="form"]'],
    keywords: ["contact", "reach", "touch", "email", "phone", "message"],
  },
  {
    type: "gallery",
    selectors: ['[class*="gallery"]', '[class*="portfolio"]', '[class*="grid"]'],
    keywords: ["gallery", "portfolio", "work", "projects"],
  },
  {
    type: "services",
    selectors: ['[class*="service"]', '[class*="feature"]', '[class*="benefit"]'],
    keywords: ["service", "feature", "benefit", "offer", "solution"],
  },
  {
    type: "about",
    selectors: ['[class*="about"]', '[class*="story"]', '[class*="mission"]'],
    keywords: ["about", "story", "mission", "vision", "team", "who we are"],
  },
  {
    type: "cta",
    selectors: ['[class*="cta"]', '[class*="call-to-action"]', '[class*="subscribe"]'],
    keywords: ["cta", "call-to-action", "get started", "sign up", "subscribe", "join now"],
  },
  {
    type: "footer",
    selectors: ["footer", '[class*="footer"]'],
    keywords: ["footer", "copyright", "rights reserved"],
  },
];

export class ComponentDetector {
  detect(html: string): DetectedComponent[] {
    const $ = load(html);
    const components: DetectedComponent[] = [];

    // Remove script and style tags from consideration
    $("script, style, link").remove();

    const sections = $("section, div[class], article, aside, main, nav, header, footer").toArray();
    let order = 0;

    for (const el of sections) {
      const $el = $(el);
      const outerHtml = $.html(el);
      const text = $el.text().toLowerCase();
      const className = ($el.attr("class") ?? "").toLowerCase();
      const id = ($el.attr("id") ?? "").toLowerCase();
      const combined = `${className} ${id} ${text}`;

      for (const pattern of COMPONENT_PATTERNS) {
        let confidence = 0;

        // Check selectors
        for (const selector of pattern.selectors) {
          if ($el.is(selector)) {
            confidence += 0.4;
            break;
          }
        }

        // Check keywords
        const keywordMatches = pattern.keywords.filter((kw) => combined.includes(kw));
        confidence += keywordMatches.length * 0.15;

        if (confidence >= 0.3) {
          components.push({
            type: pattern.type,
            html: outerHtml,
            confidence: Math.min(confidence, 1),
            order: order++,
          });
          break; // Each element maps to one component type
        }
      }
    }

    // Deduplicate: keep highest-confidence for each type
    const byType = new Map<ComponentType, DetectedComponent>();
    for (const comp of components) {
      const existing = byType.get(comp.type);
      if (!existing || comp.confidence > existing.confidence) {
        byType.set(comp.type, comp);
      }
    }

    return Array.from(byType.values()).sort((a, b) => a.order - b.order);
  }
}

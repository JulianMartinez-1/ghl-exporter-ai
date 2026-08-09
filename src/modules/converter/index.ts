import path from "path";
import { HtmlParser, type ScriptEntry } from "./html-parser";
import { ResourceNormalizer } from "../extractor/resource-normalizer";
import {
  generateVercelJson,
  generateExportedPackageJson,
} from "./generators/page.generator";
import { slugify } from "@/lib/utils";
import type { ExtractedPage, GeneratedProject, GeneratedFile, ExtractedAsset } from "@/types";
import type { CrawledSite } from "../extractor/website-crawler";

/**
 * Rewrites relative url() and @import references in CSS to absolute using the
 * CSS file's own URL as base. Handles both url('path') and @import "path" forms.
 */
function rewriteCssToAbsolute(css: string, baseUrl: string): string {
  // Rewrite url() references
  let result = css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (match, quote, rawUrl) => {
    const url = rawUrl.trim();
    if (!url || url.startsWith("data:") || url.startsWith("http") || url.startsWith("//")) {
      return match;
    }
    try {
      const absolute = new URL(url, baseUrl).href;
      return `url(${quote}${absolute}${quote})`;
    } catch {
      return match;
    }
  });

  // Rewrite @import "relative/path.css" and @import url('relative/path.css')
  result = result.replace(
    /@import\s+(?:url\(\s*)?(['"]?)([^'");\s]+)\1(?:\s*\))?/g,
    (match, _quote, rawUrl) => {
      const url = rawUrl.trim();
      if (!url || url.startsWith("http") || url.startsWith("//") || url.startsWith("data:")) {
        return match;
      }
      try {
        const absolute = new URL(url, baseUrl).href;
        return match.replace(url, absolute);
      } catch {
        return match;
      }
    }
  );

  return result;
}

/**
 * Downloads CSS from an external URL and rewrites relative url()/@ import refs to absolute.
 * Returns empty string on any failure — callers should treat it as optional enrichment.
 */
async function fetchExternalCss(cssUrl: string): Promise<string> {
  try {
    const res = await fetch(cssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "Accept": "text/css,*/*;q=0.1",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return "";
    const text = await res.text();
    return rewriteCssToAbsolute(text, cssUrl);
  } catch {
    return "";
  }
}

// GHL-specific CDN domains whose CSS is already embedded in ghl-styles.css.
// Their URLs are signed (expire in hours), so they must NOT be added as live <link> tags.
const GHL_CDN_DOMAINS = [
  "storage.googleapis.com/msgsndr",
  ".msgsndr.com",
  "leadconnectorhq.com",
  "services.leadconnectorhq.com",
];

/**
 * Builds the captured CSS + animation-visibility safety overrides.
 *
 * Rules use targeted selectors so they only activate when animation libraries
 * have failed to initialize — they must NOT interfere with AOS/ScrollReveal when
 * those libraries work correctly (broad !important overrides break animations).
 */
function buildGhlStylesCss(inlineCss: string): string {
  // Base styles prepended BEFORE page CSS so the page's own captured CSS always wins.
  const navbarBase = `
/* GHL Export: navbar scroll base */
header, nav, .navbar, [class*="site-header"], [class*="nav-bar"] {
  transition: transform 0.35s ease, box-shadow 0.3s ease, padding 0.3s ease, background-color 0.3s ease;
}
header.nav--hidden, nav.nav--hidden, .navbar.nav--hidden,
header.hide, nav.hide, .navbar.hide {
  transform: translateY(-100%);
}
header.scrolled, nav.scrolled, .navbar.scrolled {
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
}

/* ── Modal / Popup base styles ───────────────────────────────────────────── */
/* Modals that lack explicit display:none rely on missing .show/.active class */
.modal:not(.show):not(.active):not(.open):not(.in):not(.is-open),
.popup:not(.show):not(.active):not(.open):not(.is-open),
.dialog:not(.show):not(.active):not(.open),
.lightbox:not(.show):not(.active):not(.open),
.hl-popup:not(.show):not(.active):not(.open),
[data-element-type="popup"]:not(.show):not(.active):not(.open) {
  display: none !important;
}
/* Ensure modals that ARE open appear above everything */
.modal.show, .modal.active, .modal.open, .modal.is-open,
.popup.show, .popup.active, .popup.open, .popup.is-open,
.hl-popup.show, .hl-popup.active, .hl-popup.open,
[data-element-type="popup"].show, [data-element-type="popup"].active {
  display: flex !important;
  z-index: 99999;
}
/* Smooth open/close transition for modals */
.modal, .popup, .dialog, .lightbox, .hl-popup, [data-element-type="popup"] {
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
/* Swiper / carousel: make sure slides are visible when no JS */
.swiper-slide, .owl-item, .slick-slide, .carousel-item, .slide {
  visibility: visible !important;
}
/* Prevent images inside carousels from jumping */
.swiper-wrapper, .owl-stage, .slick-list { overflow: hidden; }
`;

  const safetyOverrides = `
/* GHL Export: safety overrides — ensure page content is visible */

/* Body must always be opaque — GHL builder sets opacity:0 during JS init,
   relying on its own JS to restore it. In a static export that JS may be absent. */
html, body { opacity: 1 !important; }

/* GHL structural elements — force display/visibility but NOT opacity globally
   (opacity is managed by animation libraries; broad !important would kill all animations). */
[data-element-type] { visibility: visible !important; }
.hl-page-section { display: block !important; }

/* AOS: force visible ONLY when AOS library never ran at all (no aos-init class was set).
   When AOS works correctly it adds aos-init to every [data-aos] element, so this rule
   becomes inactive and AOS controls opacity normally (fade-in on scroll). */
[data-aos]:not(.aos-init) {
  opacity: 1 !important;
  transform: none !important;
  visibility: visible !important;
}

/* ScrollReveal / SAL: similar — no state attribute means SR never ran */
[data-sal]:not([data-sal-state]) {
  opacity: 1 !important;
  transform: none !important;
  visibility: visible !important;
}

/* WOW.js: elements WOW never activated because JS failed entirely */
.wow:not(.animated):not(.wow-animated) { visibility: visible !important; opacity: 1 !important; }

/* Animate.css used directly without a scroll trigger */
[class*="animate__"][class*="animate__delay-"] { animation-play-state: running !important; }
`;
  return navbarBase + (inlineCss.trim() ? "\n" + inlineCss + "\n\n" : "\n") + safetyOverrides;
}

/**
 * Safety-net script placed AFTER all page scripts so it can:
 * 1. Force body visible (GHL sets opacity:0 during init).
 * 2. Restore AOS scroll animations.
 * 3. Auto-init Swiper / OwlCarousel / Slick / GLightbox / Fancybox / Magnific Popup.
 * 4. Handle all pop-up/modal patterns including GHL-specific and href="#id" triggers.
 * 5. Generic prev/next image carousel fallback for custom sliders.
 * 6. Before/after image slider drag handle.
 * 7. Hamburger / mobile nav toggle.
 * 8. Tab components.
 * 9. Accordion / FAQ.
 * 10. Dropdown menus.
 * 11. Scroll navbar hide/show + shrink.
 * 12. Back to top button.
 * 13. Parallax (Jarallax + simple fallback).
 * 14. Counter / number animation.
 * 15. Progress bar / skill bar animation.
 * 16. Typed.js text typing animation.
 * 17. Isotope / Masonry grid + filter buttons.
 * 18. Video autoplay in viewport.
 * 19. Tooltip init (Tippy / Bootstrap).
 * 20. 3s fallback: force invisible elements visible.
 */
function buildAnimationSafetyScript(): string {
  return `<script>
(function () {
  // ── 1. Force body visible ─────────────────────────────────────────────────
  try { document.body.style.setProperty('opacity','1','important'); } catch(e) {}
  try { document.documentElement.style.setProperty('opacity','1','important'); } catch(e) {}

  // ── 2. AOS: enable scroll animations ─────────────────────────────────────
  try {
    if (typeof AOS !== 'undefined' && typeof AOS.init === 'function') {
      document.querySelectorAll('[data-aos].aos-animate').forEach(function(el) {
        if (el.getBoundingClientRect().top > window.innerHeight + 50) {
          el.classList.remove('aos-animate');
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
          el.style.removeProperty('visibility');
        }
      });
      AOS.init({ once: true, duration: 800, offset: 80 });
      AOS.refresh();
    } else if (!document.querySelector('[data-aos].aos-init')) {
      document.querySelectorAll('[data-aos]').forEach(function(el) {
        var cs = window.getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.1) {
          el.style.setProperty('opacity','1','important');
          el.style.setProperty('transform','none','important');
        }
      });
    }
  } catch(e) {}

  // ── 3. Slider / carousel libraries auto-init ──────────────────────────────

  // Swiper (includes GHL's hl-swiper variant)
  try {
    if (typeof Swiper !== 'undefined') {
      document.querySelectorAll(
        '.swiper:not(.swiper-initialized),.swiper-container:not(.swiper-container-initialized),' +
        '[class*="hl-swiper"]:not(.swiper-initialized)'
      ).forEach(function(el) {
        if (el.swiper) return;
        if (el.closest('.swiper-initialized,.swiper-container-initialized')) return;
        try {
          var cfg = {
            loop: el.dataset.swiperLoop !== 'false',
            speed: parseInt(el.dataset.swiperSpeed) || 600,
            effect: el.dataset.swiperEffect || 'slide',
            slidesPerView: el.dataset.swiperSlidesPerView || 'auto',
            spaceBetween: parseInt(el.dataset.swiperSpaceBetween) || 0,
            autoplay: el.dataset.swiperAutoplay
              ? { delay: parseInt(el.dataset.swiperAutoplay) || 4500, disableOnInteraction: false }
              : { delay: 4500, disableOnInteraction: false },
            pagination: { el: el.querySelector('.swiper-pagination'), clickable: true, dynamicBullets: true },
            navigation: {
              nextEl: el.querySelector('.swiper-button-next'),
              prevEl: el.querySelector('.swiper-button-prev'),
            },
            scrollbar: { el: el.querySelector('.swiper-scrollbar') },
            breakpoints: {
              320:  { slidesPerView: parseInt(el.dataset.swiperMobile)  || 1 },
              768:  { slidesPerView: parseInt(el.dataset.swiperTablet)  || 2 },
              1024: { slidesPerView: parseInt(el.dataset.swiperDesktop) || parseInt(el.dataset.swiperSlidesPerView) || 'auto' },
            },
          };
          new Swiper(el, cfg);
        } catch(e) {}
      });
    }
  } catch(e) {}

  // Owl Carousel
  try {
    if (typeof jQuery !== 'undefined' && typeof jQuery.fn.owlCarousel !== 'undefined') {
      jQuery('.owl-carousel:not(.owl-loaded)').each(function() {
        var $el = jQuery(this);
        $el.owlCarousel({
          items:           parseInt($el.data('items'))            || 1,
          loop:            $el.data('loop')                       !== false,
          autoplay:        $el.data('autoplay')                   !== false,
          autoplayTimeout: parseInt($el.data('autoplay-timeout')) || 5000,
          dots:            $el.data('dots')                       !== false,
          nav:             $el.data('nav')                        !== false,
          navText:         ['&#8249;','&#8250;'],
          responsive: {
            0:    { items: parseInt($el.data('items-mobile'))  || 1 },
            768:  { items: parseInt($el.data('items-tablet'))  || parseInt($el.data('items')) || 1 },
            1024: { items: parseInt($el.data('items'))         || 1 },
          },
        });
      });
    }
  } catch(e) {}

  // Slick Slider
  try {
    if (typeof jQuery !== 'undefined' && typeof jQuery.fn.slick !== 'undefined') {
      jQuery('.slick-slider:not(.slick-initialized),[class*="slick-"]:not(.slick-initialized)').each(function() {
        var $el = jQuery(this);
        if ($el.find('.slick-slide').length || $el.children().length < 2) return;
        try {
          $el.slick({
            dots:           $el.data('dots')            !== false,
            arrows:         $el.data('arrows')          !== false,
            infinite:       $el.data('infinite')        !== false,
            autoplay:       $el.data('autoplay')        !== false,
            autoplaySpeed:  parseInt($el.data('autoplay-speed')) || 4000,
            speed:          parseInt($el.data('speed'))          || 500,
            slidesToShow:   parseInt($el.data('slides-to-show')) || 1,
            slidesToScroll: parseInt($el.data('slides-to-scroll')) || 1,
            adaptiveHeight: true,
            prevArrow: '<button type="button" class="slick-prev">&#8249;</button>',
            nextArrow: '<button type="button" class="slick-next">&#8250;</button>',
          });
        } catch(e) {}
      });
    }
  } catch(e) {}

  // GLightbox
  try {
    if (typeof GLightbox !== 'undefined') {
      GLightbox({ selector: '.glightbox,[data-glightbox],[data-lightbox="gallery"]' });
    }
  } catch(e) {}

  // Magnific Popup
  try {
    if (typeof jQuery !== 'undefined' && typeof jQuery.fn.magnificPopup !== 'undefined') {
      jQuery('a[data-mfp-src],[data-mfp-type],.popup-youtube,.popup-vimeo').magnificPopup({ type: 'iframe' });
      jQuery('a.image-popup,[data-popup-image]').magnificPopup({ type: 'image', gallery: { enabled: true } });
    }
  } catch(e) {}

  // Fancybox
  try {
    if (typeof Fancybox !== 'undefined') {
      Fancybox.bind('[data-fancybox]');
    } else if (typeof jQuery !== 'undefined' && typeof jQuery.fn.fancybox !== 'undefined') {
      jQuery('[data-fancybox]').fancybox();
    }
  } catch(e) {}

  // VenoBox
  try {
    if (typeof VenoBox !== 'undefined') {
      new VenoBox({ selector: '.venobox,[data-vbtype]' });
    }
  } catch(e) {}

  // ── 4. GSAP ScrollTrigger refresh ────────────────────────────────────────
  try {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.refresh();
    } else if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  } catch(e) {}

  // ── 5. Hamburger / mobile nav toggle ─────────────────────────────────────
  (function () {
    var btnSel = [
      '.hamburger','.hamburger-menu','.hamburger-btn',
      '.navbar-toggler','.nav-toggle','.menu-toggle','.menu-btn',
      '[class*="hamburger"]','[class*="mobile-toggle"]','[class*="nav-btn"]',
      '[data-toggle="collapse"]','[data-bs-toggle="collapse"]',
      'button[class*="menu"]','button[class*="nav-open"]',
      '[aria-label*="menu" i]','[aria-label*="navigation" i]',
    ].join(',');
    document.querySelectorAll(btnSel).forEach(function(btn) {
      if (btn.__hlHamburger) return;
      btn.__hlHamburger = true;
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function() {
        var targetSel = btn.getAttribute('data-target') ||
                        btn.getAttribute('data-bs-target') ||
                        btn.getAttribute('aria-controls');
        var nav = null;
        try { if (targetSel) nav = document.querySelector(targetSel); } catch(e) {}
        if (!nav) {
          var hdrParent = btn.closest('header,nav,[class*="header"],[class*="navbar"]');
          if (hdrParent) nav = hdrParent.querySelector(
            '.nav-menu,.navbar-menu,.navbar-collapse,.mobile-nav,.mobile-menu,' +
            '.nav-links,.menu-items,[class*="nav-menu"],[class*="mobile-menu"],[class*="nav-list"]'
          );
        }
        if (!nav) nav = btn.nextElementSibling || document.querySelector('.site-nav,.main-menu,.nav-list,.primary-menu');
        if (!nav) return;
        var isOpen = nav.classList.contains('open') || nav.classList.contains('active') ||
                     nav.classList.contains('show') || nav.classList.contains('is-open');
        ['open','active','show','is-open'].forEach(function(c) { nav.classList.toggle(c, !isOpen); });
        btn.classList.toggle('active', !isOpen);
        btn.classList.toggle('is-active', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen && window.getComputedStyle(nav).display === 'none') {
          nav.style.display = 'flex';
        } else if (isOpen) {
          nav.style.removeProperty('display');
        }
      });
    });
  })();

  // ── 6. Tab components ─────────────────────────────────────────────────────
  (function () {
    var tabBtnSel = [
      '[data-tab]','[data-tab-id]','[data-tab-index]',
      '.tab-title','.tab-btn','.tab-button','.tab-link',
      '.hl-tab','.hl-tab-nav-link',
      '[class*="tab-nav"] > *','[class*="tab-header"] > li',
      '.nav-tabs .nav-link','.nav-tabs .nav-item > a',
      '[role="tab"]',
    ].join(',');
    document.querySelectorAll(tabBtnSel).forEach(function(btn) {
      if (btn.__hlTab) return;
      btn.__hlTab = true;
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var target = btn.getAttribute('data-tab') || btn.getAttribute('data-tab-id') ||
                     btn.getAttribute('data-tab-index') || btn.getAttribute('data-target') ||
                     btn.getAttribute('href');
        var navParent = btn.closest('[class*="tab-nav"],[class*="tab-header"],.nav-tabs,ul') || btn.parentElement;
        if (navParent) navParent.querySelectorAll(
          '[data-tab],[data-tab-id],[role="tab"],.tab-title,.tab-btn,.tab-button,.tab-link,.nav-link,.hl-tab-nav-link'
        ).forEach(function(b) {
          b.classList.remove('active','current','is-active','selected','show');
          b.setAttribute('aria-selected','false');
        });
        btn.classList.add('active','show');
        btn.setAttribute('aria-selected','true');
        if (target) {
          var clean = target.replace(/^#/,'');
          var panel = document.getElementById(clean) ||
                      document.querySelector('[data-panel="' + clean + '"]') ||
                      document.querySelector('[data-tab-content="' + clean + '"]') ||
                      document.querySelector('.tab-pane[aria-labelledby="' + btn.id + '"]') ||
                      document.querySelector('[aria-labelledby="' + btn.id + '"]');
          if (panel) {
            var panelContainer = panel.closest('[class*="tab-content"],.tab-content') || panel.parentElement;
            if (panelContainer) panelContainer.querySelectorAll(
              '[data-panel],[role="tabpanel"],.tab-pane,.hl-tab-pane'
            ).forEach(function(p) {
              p.classList.remove('active','current','is-active','show');
              p.setAttribute('aria-hidden','true');
              p.style.display = 'none';
            });
            panel.classList.add('active','show');
            panel.setAttribute('aria-hidden','false');
            panel.style.removeProperty('display');
          }
        }
      });
    });
    // Activate first tab if none is active
    document.querySelectorAll('[class*="tab-nav"],[class*="tab-header"],.nav-tabs').forEach(function(nav) {
      if (!nav.querySelector('.active,.current,[aria-selected="true"]')) {
        var firstBtn = nav.querySelector('[data-tab],[data-tab-id],[role="tab"],.tab-title,.nav-link,.hl-tab-nav-link');
        if (firstBtn) firstBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
  })();

  // ── 7. Accordion / FAQ toggle ─────────────────────────────────────────────
  (function () {
    var triggerSel = [
      '.faq-question','.accordion-trigger','.accordion-header','.accordion-btn',
      '[class*="faq"] [class*="question"]',
      '[class*="faq-item"] > :first-child',
      '[class*="accordion-item"] > :first-child',
      '[data-toggle="accordion"]','[data-accordion]',
      '[role="button"][aria-expanded]',
    ].join(',');
    document.querySelectorAll(triggerSel).forEach(function(trigger) {
      if (trigger.__hlAccordion) return;
      trigger.__hlAccordion = true;
      trigger.style.cursor = 'pointer';
      trigger.addEventListener('click', function() {
        var item = trigger.closest('.faq-item,.accordion-item,[class*="faq-item"],[class*="accordion-item"]') ||
                   trigger.parentElement;
        if (!item) return;
        var body = item.querySelector(
          '.faq-answer,.faq-body,.accordion-body,.accordion-content,.accordion-panel,' +
          '[class*="answer"],[class*="faq-body"],[class*="accordion-body"],[class*="collapse"]'
        ) || trigger.nextElementSibling;
        if (!body) return;
        var isOpen = item.classList.contains('active') || item.classList.contains('open') ||
                     body.classList.contains('show') || window.getComputedStyle(body).display !== 'none';
        item.classList.toggle('active', !isOpen);
        item.classList.toggle('open', !isOpen);
        body.classList.toggle('show', !isOpen);
        if (isOpen) {
          body.style.maxHeight = '0'; body.style.overflow = 'hidden';
          setTimeout(function() { body.style.display = 'none'; body.style.maxHeight = ''; body.style.overflow = ''; }, 300);
        } else {
          body.style.display = '';
          body.style.maxHeight = body.scrollHeight + 'px';
          setTimeout(function() { body.style.maxHeight = ''; }, 350);
        }
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  })();

  // ── 8. Modal / Popup — comprehensive handler ──────────────────────────────
  (function () {
    // All selectors that identify a popup/modal container
    var POPUP_CONTAINER_SEL =
      '.modal,.popup,.dialog,.lightbox,.overlay,.overlay-popup,' +
      '.hl-popup,.hl-popup-container,[class*="popup-wrapper"],[class*="modal-wrapper"],' +
      '[class*="popup-container"],[class*="modal-container"],[class*="lightbox-container"],' +
      '[role="dialog"],[data-element-type="popup"]';

    // All selectors that close a modal
    var closeSel = [
      '[data-dismiss="modal"]','[data-bs-dismiss="modal"]','[data-close]',
      '.modal-close','.popup-close','.dialog-close','.close','.btn-close',
      '[class*="close-modal"]','[class*="modal-close"]','[class*="popup-close"]',
      '[class*="close-btn"]','[class*="close-button"]','[class*="close-popup"]',
      '[class*="popup-dismiss"]','[class*="modal-dismiss"]',
      '[aria-label*="close" i]','[aria-label*="cerrar" i]','[aria-label*="dismiss" i]',
      '[title*="close" i]','[title*="cerrar" i]',
    ].join(',');

    function openModal(modal) {
      modal.style.removeProperty('display');
      var computedDisplay = window.getComputedStyle(modal).display;
      if (computedDisplay === 'none') modal.style.display = 'flex';
      modal.style.removeProperty('visibility');
      modal.style.removeProperty('opacity');
      modal.classList.add('show','active','open','is-open','visible','in','shown','fade-in');
      modal.setAttribute('aria-hidden','false');
      modal.setAttribute('aria-modal','true');
      document.body.classList.add('modal-open','has-popup','has-overlay');
      document.body.style.overflow = 'hidden';
      // Backdrop click closes modal
      setTimeout(function() {
        modal.addEventListener('click', function onBackdrop(e) {
          if (e.target === modal ||
              e.target.classList.contains('modal-backdrop') ||
              e.target.classList.contains('popup-overlay') ||
              e.target.classList.contains('modal-overlay') ||
              e.target.classList.contains('overlay-bg') ||
              e.target.getAttribute('data-dismiss') === 'modal') {
            closeModal(modal);
            modal.removeEventListener('click', onBackdrop);
          }
        });
      }, 50);
      // Wire close buttons inside this modal
      modal.querySelectorAll(closeSel).forEach(function(btn) {
        if (!btn.__hlModalClose) {
          btn.__hlModalClose = true;
          btn.addEventListener('click', function(e) { e.preventDefault(); closeModal(modal); });
        }
      });
    }

    function closeModal(modal) {
      modal.classList.remove('show','active','open','is-open','visible','in','shown','fade-in');
      modal.setAttribute('aria-hidden','true');
      modal.removeAttribute('aria-modal');
      document.body.classList.remove('modal-open','has-popup','has-overlay');
      document.body.style.removeProperty('overflow');
      // Delay display:none so CSS transition can complete
      setTimeout(function() {
        var cs = window.getComputedStyle(modal);
        if (parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden') {
          modal.style.display = 'none';
        } else {
          modal.style.display = 'none';
        }
      }, 350);
    }

    // Wire global close buttons (those outside their modal)
    document.querySelectorAll(closeSel).forEach(function(btn) {
      if (btn.__hlModalClose) return;
      btn.__hlModalClose = true;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var modal = btn.closest(POPUP_CONTAINER_SEL);
        if (modal) closeModal(modal);
      });
    });

    // ── Trigger buttons — Pattern A: explicit data attributes ─────────────
    var triggerSel = [
      '[data-toggle="modal"]','[data-bs-toggle="modal"]',
      '[data-modal]','[data-popup]','[data-popup-id]',
      '[data-open]','[data-open-modal]','[data-open-popup]',
      '[data-trigger-popup]','[data-popup-trigger]',
      '[class*="popup-trigger"]','[class*="modal-trigger"]',
      '[class*="open-modal"]','[class*="open-popup"]',
      '[class*="popup-open"]','[class*="trigger-popup"]',
      '[data-element-type="popup-trigger"]',
    ].join(',');

    document.querySelectorAll(triggerSel).forEach(function(btn) {
      if (btn.__hlModalTrigger) return;
      btn.__hlModalTrigger = true;
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var targetSel =
          btn.getAttribute('data-target') || btn.getAttribute('data-bs-target') ||
          btn.getAttribute('data-modal')  || btn.getAttribute('data-popup') ||
          btn.getAttribute('data-popup-id') || btn.getAttribute('data-open') ||
          btn.getAttribute('data-open-modal') || btn.getAttribute('data-open-popup') ||
          btn.getAttribute('href');
        if (!targetSel) return;
        var clean = targetSel.replace(/^#/, '');
        var modal = document.getElementById(clean) ||
                    document.querySelector('[data-popup="' + clean + '"]') ||
                    document.querySelector('[data-modal="' + clean + '"]') ||
                    document.querySelector('[data-popup-id="' + clean + '"]') ||
                    (clean ? (function() { try { return document.querySelector('.' + CSS.escape(clean)); } catch(e2) { return null; } })() : null);
        if (modal) openModal(modal);
      });
    });

    // ── Trigger buttons — Pattern B: href="#popup-id" anchor links ────────
    // Very common GHL pattern: <a href="#popup1">Open</a> + <div id="popup1" style="display:none">
    document.querySelectorAll('a[href^="#"]:not([href="#"]):not([href^="#/"])').forEach(function(link) {
      if (link.__hlModalTrigger || link.__hlTab || link.__hlAccordion) return;
      var id = link.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      var cs = window.getComputedStyle(target);
      // Classify as popup if: fixed/absolute positioned, has popup-related class, or role=dialog
      var isPopupLike =
        cs.position === 'fixed' || cs.position === 'absolute' ||
        target.classList.contains('modal') || target.classList.contains('popup') ||
        target.classList.contains('dialog') || target.classList.contains('lightbox') ||
        target.classList.contains('overlay') || target.classList.contains('hl-popup') ||
        target.getAttribute('data-element-type') === 'popup' ||
        target.getAttribute('role') === 'dialog';
      // If element is visible and not popup-like, it's a section anchor — skip
      if (!isPopupLike && cs.display !== 'none' && cs.visibility !== 'hidden') return;
      link.__hlModalTrigger = true;
      link.style.cursor = 'pointer';
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var nowCs = window.getComputedStyle(target);
        var isOpen = target.classList.contains('show') || target.classList.contains('active') ||
                     target.classList.contains('open') || nowCs.display !== 'none';
        if (isOpen) closeModal(target); else openModal(target);
      });
    });

    // ── Escape key closes all open modals ─────────────────────────────────
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll(
          '.modal.show,.modal.active,.popup.show,.popup.active,.hl-popup.show,.hl-popup.active,' +
          '[role="dialog"].show,.lightbox.show,.overlay.show'
        ).forEach(function(m) { closeModal(m); });
      }
    });
  })();

  // ── 9. Generic image carousel / slider (prev/next) ────────────────────────
  // Handles custom carousels not covered by Swiper/Owl/Slick
  (function () {
    var carouselSel = [
      '.carousel:not(.swiper):not(.owl-carousel)',
      '.slider:not(.slick-initialized):not(.swiper)',
      '[class*="gallery-slider"]','[class*="image-slider"]','[class*="img-slider"]',
      '[class*="media-slider"]','[class*="photo-slider"]','[class*="hero-slider"]',
      '[class*="slides-wrapper"]','[class*="slider-wrapper"]:not(.swiper-wrapper)',
    ].join(',');
    document.querySelectorAll(carouselSel).forEach(function(container) {
      if (container.__hlCarousel) return;
      var slides = Array.from(container.querySelectorAll(
        '.slide,.slide-item,.carousel-item,.gallery-item,.slider-item,[class*="slide-item"],[class*="slide-"]'
      )).filter(function(s) { return s.parentElement === container || s.parentElement.parentElement === container; });
      if (slides.length < 2) return;
      container.__hlCarousel = true;
      var idx = 0;
      function show(n) {
        idx = (n + slides.length) % slides.length;
        slides.forEach(function(s, i) {
          var isActive = i === idx;
          s.style.display = isActive ? '' : 'none';
          s.classList.toggle('active', isActive);
          s.classList.toggle('current', isActive);
        });
      }
      show(0);
      var prevBtn = container.querySelector(
        '.prev,.carousel-prev,.slider-prev,[class*="prev-btn"],[class*="btn-prev"],' +
        '[class*="arrow-prev"],[class*="prev-arrow"],[aria-label*="prev" i],[aria-label*="anterior" i]'
      );
      var nextBtn = container.querySelector(
        '.next,.carousel-next,.slider-next,[class*="next-btn"],[class*="btn-next"],' +
        '[class*="arrow-next"],[class*="next-arrow"],[aria-label*="next" i],[aria-label*="siguiente" i]'
      );
      if (prevBtn) prevBtn.addEventListener('click', function() { show(idx - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function() { show(idx + 1); });
      // Pagination dots
      container.querySelectorAll('.dot,.carousel-dot,.slider-dot,[class*="-dot"]').forEach(function(dot, i) {
        dot.addEventListener('click', function() { show(i); });
      });
      // Touch/swipe support
      var startX = 0;
      container.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
      container.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) show(dx < 0 ? idx + 1 : idx - 1);
      }, { passive: true });
    });
  })();

  // ── 10. Before/After image slider ─────────────────────────────────────────
  (function () {
    document.querySelectorAll('.before-after,.before-after-slider,[class*="before-after"],[data-before-after]').forEach(function(container) {
      if (container.__hlBeforeAfter) return;
      container.__hlBeforeAfter = true;
      var handle = container.querySelector('.handle,.slider-handle,[class*="handle"],input[type="range"]');
      var afterLayer = container.querySelector('.after,[class*="after-img"],[class*="after-layer"],[class*="after-image"]');
      if (!handle || !afterLayer) return;
      function update(pct) {
        afterLayer.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
        afterLayer.style.webkitClipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
      }
      if (handle.type === 'range') {
        handle.addEventListener('input', function() { update(parseFloat(handle.value)); });
        update(50);
      } else {
        var dragging = false;
        handle.addEventListener('mousedown', function() { dragging = true; });
        document.addEventListener('mouseup', function() { dragging = false; });
        document.addEventListener('mousemove', function(e) {
          if (!dragging) return;
          var rect = container.getBoundingClientRect();
          update(Math.min(100, Math.max(0, (e.clientX - rect.left) / rect.width * 100)));
        });
        handle.addEventListener('touchstart', function() { dragging = true; }, { passive: true });
        document.addEventListener('touchend', function() { dragging = false; });
        document.addEventListener('touchmove', function(e) {
          if (!dragging) return;
          var rect = container.getBoundingClientRect();
          update(Math.min(100, Math.max(0, (e.touches[0].clientX - rect.left) / rect.width * 100)));
        }, { passive: true });
        update(50);
      }
    });
  })();

  // ── 11. Dropdown menus (click + document close) ───────────────────────────
  (function () {
    var dropdownSel = [
      '[data-toggle="dropdown"]','[data-bs-toggle="dropdown"]',
      '.dropdown-toggle','[class*="dropdown-btn"]','[class*="dropdown-trigger"]',
      '[aria-haspopup="true"]:not([role="tab"]):not([role="button"][aria-expanded])',
    ].join(',');
    document.querySelectorAll(dropdownSel).forEach(function(btn) {
      if (btn.__hlDropdown) return;
      btn.__hlDropdown = true;
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var parent = btn.closest('.dropdown,[class*="dropdown-wrap"]') || btn.parentElement;
        var menu = parent.querySelector(
          '.dropdown-menu,.dropdown-content,[class*="dropdown-menu"],[class*="dropdown-list"],[class*="sub-menu"]'
        ) || btn.nextElementSibling;
        if (!menu) return;
        var isOpen = menu.classList.contains('show') || menu.classList.contains('open') ||
                     window.getComputedStyle(menu).display !== 'none';
        document.querySelectorAll('.dropdown-menu.show,.dropdown-menu.open').forEach(function(m) {
          if (m !== menu) { m.classList.remove('show','open'); m.style.display = 'none'; }
        });
        menu.classList.toggle('show', !isOpen);
        menu.classList.toggle('open', !isOpen);
        if (isOpen) { menu.style.display = 'none'; } else { menu.style.removeProperty('display'); }
        btn.setAttribute('aria-expanded', String(!isOpen));
      });
    });
    document.addEventListener('click', function() {
      document.querySelectorAll('.dropdown-menu.show,.dropdown-menu.open').forEach(function(m) {
        m.classList.remove('show','open'); m.style.display = 'none';
      });
    });
  })();

  // ── 12. Scroll behavior: navbar hide-on-scroll / shrink ──────────────────
  (function () {
    var hdr = document.querySelector(
      'header,nav,#navbar,.navbar,[class*="nav-bar"],[class*="site-header"],' +
      '[id*="navbar"],[id*="header"]:not([id="header-section"]),.menu-wrap,' +
      '[class*="top-bar"],[class*="header-wrap"],[class*="main-nav"]'
    );
    if (!hdr) return;
    var cs = window.getComputedStyle(hdr);
    var hasTransition = cs.transition && cs.transition !== 'all 0s ease 0s' && cs.transition !== 'none 0s ease 0s 0s';
    if (!hasTransition) {
      hdr.style.transition = 'transform 0.35s ease,box-shadow 0.3s ease,padding 0.3s ease,background-color 0.3s ease';
    }
    var pageDefinesScrolledCss = false;
    try {
      for (var i = 0; i < document.styleSheets.length; i++) {
        try {
          var rules = document.styleSheets[i].cssRules || [];
          for (var j = 0; j < rules.length; j++) {
            var txt = rules[j].cssText || '';
            if (/(\.scrolled|\.nav--hidden|\.hl-scrolled|\.scroll-down)/.test(txt)) {
              pageDefinesScrolledCss = true; break;
            }
          }
        } catch(e2) {}
        if (pageDefinesScrolledCss) break;
      }
    } catch(e) {}
    var lastY = 0, ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          var y = window.pageYOffset;
          var goingDown = y > lastY && y > 80;
          var isScrolled = y > 50;
          hdr.classList.toggle('scrolled', isScrolled);
          hdr.classList.toggle('hl-scrolled', isScrolled);
          document.body.classList.toggle('scrolled', isScrolled);
          document.body.classList.toggle('hl-page-scrolled', isScrolled);
          if (y > 80) {
            hdr.classList.toggle('scroll-down', goingDown);
            hdr.classList.toggle('scroll-up', !goingDown);
            hdr.classList.toggle('nav--hidden', goingDown);
            hdr.classList.toggle('nav--visible', !goingDown);
            hdr.classList.toggle('hide', goingDown);
            if (!pageDefinesScrolledCss) hdr.style.transform = goingDown ? 'translateY(-100%)' : '';
          } else {
            hdr.classList.remove('scroll-down','scroll-up','nav--hidden','nav--visible','hide');
            if (!pageDefinesScrolledCss) hdr.style.transform = '';
          }
          lastY = y; ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  })();

  // ── 13. Back to top button ────────────────────────────────────────────────
  (function () {
    var backTop = document.querySelector(
      '#back-to-top,#backToTop,.back-to-top,[class*="back-top"],[class*="scroll-top"],' +
      '[class*="go-top"],[class*="to-top"],[aria-label*="top" i],[title*="top" i]'
    );
    if (!backTop) return;
    backTop.style.cursor = 'pointer';
    window.addEventListener('scroll', function() {
      var show = window.pageYOffset > 300;
      backTop.classList.toggle('show', show);
      backTop.classList.toggle('visible', show);
      backTop.style.opacity = show ? '1' : '0';
    }, { passive: true });
    backTop.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  // ── 14. Parallax (Jarallax + simple fallback) ─────────────────────────────
  try {
    if (typeof jarallax !== 'undefined') {
      jarallax(document.querySelectorAll('.jarallax,[data-jarallax]'), { speed: 0.5 });
    } else if (typeof jQuery !== 'undefined' && typeof jQuery.fn.jarallax !== 'undefined') {
      jQuery('.jarallax,[data-jarallax]').jarallax({ speed: 0.5 });
    }
  } catch(e) {}
  (function () {
    var els = document.querySelectorAll('[data-parallax]:not([data-jarallax])');
    if (!els.length) return;
    window.addEventListener('scroll', function() {
      var y = window.pageYOffset;
      els.forEach(function(el) {
        var speed = parseFloat(el.getAttribute('data-parallax-speed') || el.getAttribute('data-speed') || '0.3');
        el.style.transform = 'translateY(' + (y * speed * 0.15) + 'px)';
      });
    }, { passive: true });
  })();

  // ── 15. Counter / number animation ───────────────────────────────────────
  (function () {
    try { if (typeof CountUp !== 'undefined' || typeof countUp !== 'undefined') return; } catch(e) {}
    var counterSel = '[class*="counter"],[class*="count-up"],[data-count],[data-target-number],[class*="stat-number"],[class*="odometer"]';
    var counters = document.querySelectorAll(counterSel);
    if (!counters.length || typeof IntersectionObserver === 'undefined') return;
    function animateCount(el) {
      if (el.__hlCounted) return;
      el.__hlCounted = true;
      var raw = el.getAttribute('data-count') || el.getAttribute('data-target') || el.innerText;
      var end = parseFloat((raw || '').replace(/[^0-9.]/g, '')) || 0;
      var prefix = (el.innerText.match(/^[^0-9]*/)||[''])[0];
      var suffix = (el.innerText.match(/[^0-9.]*$/)||[''])[0];
      var duration = 2000, steps = 60, current = 0, inc = end / steps;
      var timer = setInterval(function() {
        current = Math.min(current + inc, end);
        el.innerText = prefix + Math.round(current) + suffix;
        if (current >= end) clearInterval(timer);
      }, duration / steps);
    }
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { if (e.isIntersecting) animateCount(e.target); });
    }, { threshold: 0.3 });
    counters.forEach(function(el) { obs.observe(el); });
  })();

  // ── 16. Progress bar / skill bar animation ────────────────────────────────
  (function () {
    if (typeof IntersectionObserver === 'undefined') return;
    var bars = document.querySelectorAll('[class*="progress-bar"],[class*="skill-bar"],[class*="skill-fill"],[class*="bar-fill"],[data-progress]');
    if (!bars.length) return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var bar = entry.target;
        var width = bar.getAttribute('data-progress') || bar.getAttribute('data-width') ||
                    bar.getAttribute('aria-valuenow') || bar.style.width || '0';
        bar.style.transition = bar.style.transition || 'width 1.5s ease';
        bar.style.width = (parseFloat(width) || 0) + '%';
        obs.unobserve(bar);
      });
    }, { threshold: 0.2 });
    bars.forEach(function(bar) { obs.observe(bar); });
  })();

  // ── 17. Typed.js text typing animation ───────────────────────────────────
  try {
    if (typeof Typed !== 'undefined') {
      document.querySelectorAll('[class*="typed"],[data-typed-items],[data-strings],[data-type]').forEach(function(el) {
        if (el.__hlTyped) return;
        el.__hlTyped = true;
        var raw = el.getAttribute('data-typed-items') || el.getAttribute('data-strings') ||
                  el.getAttribute('data-type') || el.innerText;
        var strings = (raw || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        if (strings.length) new Typed(el, { strings: strings, typeSpeed: 50, backSpeed: 30, loop: true });
      });
    }
  } catch(e) {}

  // ── 18. Isotope / Masonry grid + filter ──────────────────────────────────
  try {
    if (typeof Isotope !== 'undefined' || (typeof jQuery !== 'undefined' && typeof jQuery.fn.isotope !== 'undefined')) {
      document.querySelectorAll('.grid.isotope,[class*="isotope-grid"],[data-isotope]').forEach(function(grid) {
        if (grid.__hlIsotope) return;
        grid.__hlIsotope = true;
        var iso = typeof Isotope !== 'undefined'
          ? new Isotope(grid, { itemSelector: '.grid-item', layoutMode: 'masonry' })
          : jQuery(grid).isotope({ itemSelector: '.grid-item' });
        document.querySelectorAll('[data-filter]').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var filter = btn.getAttribute('data-filter');
            if (typeof Isotope !== 'undefined') iso.arrange({ filter: filter });
            else jQuery(grid).isotope({ filter: filter });
            document.querySelectorAll('[data-filter]').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
          });
        });
      });
    }
  } catch(e) {}

  // ── 19. Video: autoplay muted videos in viewport ──────────────────────────
  (function () {
    if (typeof IntersectionObserver === 'undefined') return;
    var videos = document.querySelectorAll('video[autoplay],video[data-autoplay]');
    if (!videos.length) return;
    var vObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var vid = entry.target;
        if (entry.isIntersecting) { vid.muted = true; vid.play().catch(function(){}); }
        else vid.pause();
      });
    }, { threshold: 0.25 });
    videos.forEach(function(vid) { vObs.observe(vid); });
  })();

  // ── 20. Tooltip init (Tippy / Bootstrap) ─────────────────────────────────
  try {
    if (typeof tippy !== 'undefined') {
      tippy('[data-tippy-content],[title]:not(head title)', { allowHTML: true });
    } else if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
      document.querySelectorAll('[data-bs-toggle="tooltip"],[data-toggle="tooltip"]').forEach(function(el) {
        try { new bootstrap.Tooltip(el); } catch(e) {}
      });
    }
  } catch(e) {}

  // ── 21. 3s fallback: force still-invisible elements visible ───────────────
  setTimeout(function() {
    var aosRunning = typeof AOS !== 'undefined' && !!document.querySelector('[data-aos].aos-init');
    if (!aosRunning) {
      document.querySelectorAll('[data-aos]').forEach(function(el) {
        var cs = window.getComputedStyle(el);
        if (parseFloat(cs.opacity) < 0.1 || cs.visibility === 'hidden') {
          el.style.setProperty('opacity','1','important');
          el.style.setProperty('transform','none','important');
          el.style.setProperty('visibility','visible','important');
          el.style.setProperty('transition','none','important');
        }
      });
    }
    document.querySelectorAll('[data-sal],[data-wow-duration],[data-sr-id],.wow:not(.animated)').forEach(function(el) {
      var cs = window.getComputedStyle(el);
      if (parseFloat(cs.opacity) < 0.1 || cs.visibility === 'hidden') {
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('transform','none','important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('transition','none','important');
      }
    });
    document.querySelectorAll('[data-element-type],.hl-element-wrapper,.hl-page-section').forEach(function(el) {
      var cs = window.getComputedStyle(el);
      if (parseFloat(cs.opacity) < 0.05) el.style.setProperty('opacity','1','important');
      if (cs.display === 'none' && el.closest('[data-element-type="section"],.hl-page-section')) {
        el.style.setProperty('display','block','important');
      }
    });
  }, 3000);
})();
</script>`;
}

/**
 * Builds the full HTML document served as a static file.
 *
 * Static HTML approach:
 * - Scripts execute in proper DOMContentLoaded / load order
 * - Animations (AOS, GSAP, Swiper), tabs, accordions, sliders all work
 * - No React hydration, no build step, Vercel serves from CDN directly
 *
 * File layout in the generated repo:
 *   index.html        → served at /
 *   ghl-styles.css    → served at /ghl-styles.css  (all captured CSS, self-contained)
 *   assets/<file>     → served at /assets/<file>
 *
 * cdnCssLinks: absolute CDN stylesheet URLs added as <link> tags for fonts / external libs
 * that may not be fully captured (e.g. Google Fonts @font-face subsets).
 */
function buildScriptTags(orderedScripts: ScriptEntry[], jsUrlMap: Map<string, string>): string {
  return orderedScripts.map((s) => {
    if (s.kind === "external") {
      const src = jsUrlMap.get(s.value) ?? s.value;
      const typeAttr = s.attrs.type ? ` type="${s.attrs.type}"` : "";
      const deferAttr = "defer" in s.attrs ? " defer" : "";
      const asyncAttr = "async" in s.attrs ? " async" : "";
      const crossAttr = s.attrs.crossorigin ? ` crossorigin="${s.attrs.crossorigin}"` : "";
      return `<script src="${src}"${typeAttr}${deferAttr}${asyncAttr}${crossAttr}></script>`;
    } else {
      const typeAttr = s.attrs.type ? ` type="${s.attrs.type}"` : "";
      return `<script${typeAttr}>\n${s.value}\n</script>`;
    }
  }).join("\n");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function buildAttrStr(attribs: Record<string, string>): string {
  return Object.entries(attribs)
    .filter(([k]) => k !== "style" || attribs[k]) // skip empty style
    .map(([k, v]) => (v === "" ? k : `${k}="${escapeAttr(v)}"`))
    .join(" ");
}

function buildStaticHtml(
  headHtml: string,
  bodyHtml: string,
  scriptTagsHtml: string,
  lang: string,
  cdnCssLinks: string[] = [],
  bodyAttribs: Record<string, string> = {},
  htmlAttribs: Record<string, string> = {},
): string {
  // Add back absolute CDN CSS links (fonts, icon libs, etc.) AFTER ghl-styles.css so
  // local captured CSS wins specificity over CDN defaults.
  const cdnLinkTags = cdnCssLinks
    .map((url) => `<link rel="stylesheet" href="${url}">`)
    .join("\n");

  // Preserve class/style on <html> for rem-based sizing and theme tokens.
  // Keep our explicit lang= first; strip lang from htmlAttribs to avoid duplication.
  const { lang: _l, ...htmlExtra } = htmlAttribs;
  const htmlExtraStr = buildAttrStr(htmlExtra);

  // Preserve all attributes on <body> — GHL JS often adds classes like
  // "hl-page-loaded" or "fonts-loaded" during init, and CSS rules hide the
  // body until those classes appear. The Playwright capture has the final
  // DOM state with those classes set; we must keep them in the static export.
  const bodyAttrStr = buildAttrStr(bodyAttribs);

  // Safety overrides placed as inline <style> at end of <head> so they appear AFTER
  // any GHL inline <style> blocks that may use opacity:0 !important on body/html.
  // A linked stylesheet (ghl-styles.css) loses to later inline styles in cascade order.
  const inlineSafetyStyle = `<style>
html,body{opacity:1!important;visibility:visible!important}
[data-element-type]{visibility:visible!important}
.hl-page-section{display:block!important}
[data-aos]:not(.aos-init){opacity:1!important;transform:none!important;visibility:visible!important}
[data-sal]:not([data-sal-state]){opacity:1!important;transform:none!important;visibility:visible!important}
.wow:not(.animated):not(.wow-animated){visibility:visible!important;opacity:1!important}
[class*="animate__"][class*="animate__delay-"]{animation-play-state:running!important}
/* Modals hidden by default — JS opens them */
.modal:not(.show):not(.active):not(.open):not(.in):not(.is-open),
.popup:not(.show):not(.active):not(.open):not(.is-open),
.hl-popup:not(.show):not(.active):not(.open),
[data-element-type="popup"]:not(.show):not(.active):not(.open){display:none!important}
/* Open modals always on top */
.modal.show,.modal.active,.popup.show,.popup.active,.hl-popup.show,.hl-popup.active{display:flex!important;z-index:99999}
/* Carousel slides: visible by default (Swiper/Owl/Slick set display themselves) */
.swiper-slide,.owl-item,.slick-slide,.carousel-item{visibility:visible!important}
</style>`;

  return `<!DOCTYPE html>
<html lang="${lang}"${htmlExtraStr ? " " + htmlExtraStr : ""}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/ghl-styles.css">
${cdnLinkTags}
${headHtml}
${inlineSafetyStyle}
</head>
<body${bodyAttrStr ? " " + bodyAttrStr : ""}>
${bodyHtml}
${scriptTagsHtml}
${buildAnimationSafetyScript()}
</body>
</html>`;
}

export class PageConverter {
  private parser = new HtmlParser();
  private normalizer = new ResourceNormalizer();

  async convert(
    extracted: ExtractedPage,
    projectName: string,
    onProgress?: (msg: string) => void
  ): Promise<GeneratedProject> {
    onProgress?.("Parseando HTML...");
    const parsed = this.parser.parse(extracted.html);
    const allAssets = [...extracted.images, ...extracted.fonts, ...extracted.videos, ...extracted.scripts];

    const bodyHtml = this.normalizer.rewriteHtmlAssetUrls(parsed.cleanBodyHtml || extracted.html, allAssets);
    const headHtml = this.normalizer.rewriteHtmlAssetUrls(parsed.headContent, allAssets);

    onProgress?.("Construyendo CSS completo...");

    // Base captured CSS: CSSOM dump (playwright) + downloaded CSS file content
    let inlineCss = extracted.css.filter((s) => s.trim()).join("\n\n");

    // Always fetch CSS from external URLs server-side and embed in ghl-styles.css:
    //
    // WHY ALWAYS:
    //   1. GHL pages may use signed CDN URLs (e.g. AWS S3 pre-signed) that expire within
    //      hours — embedding the CSS at export time makes it permanent on Vercel.
    //   2. Playwright route.fetch() can fail silently (CF bot checks, HTTP/2 quirks) so
    //      route-intercepted CSS may be incomplete even when inlineCss looks non-empty.
    //   3. For api/fetch methods Playwright never ran, so fetch is the only source.
    //
    // Google Fonts are excluded — they serve browser-specific Unicode subsets (WOFF2 for
    // Chrome, WOFF for older browsers) that only work correctly via the <link> CDN tag.
    //
    // We also keep CDN <link> tags (live URLs) as a fallback so the browser can load
    // the latest version if ghl-styles.css somehow gets stale.
    const cssUrlsToFetch = extracted.externalCssUrls.filter(
      (u) =>
        u.startsWith("http") &&
        !u.includes("fonts.googleapis.com") &&
        !u.includes("fonts.gstatic.com")
    );

    if (cssUrlsToFetch.length > 0) {
      onProgress?.(`Descargando ${cssUrlsToFetch.length} hoja(s) CSS externas para embed permanente...`);
      const fetched = await Promise.all(cssUrlsToFetch.map((url) => fetchExternalCss(url)));
      const fetchedCss = fetched.filter(Boolean).join("\n\n");
      if (fetchedCss) inlineCss = inlineCss ? `${inlineCss}\n\n${fetchedCss}` : fetchedCss;
    }

    onProgress?.("Generando HTML estático completo con scripts...");

    // Build JS URL map: original src → local /assets/ path
    const jsUrlMap = new Map<string, string>();
    for (const asset of extracted.scripts) {
      jsUrlMap.set(asset.originalUrl, `/assets/${path.basename(asset.localPath)}`);
    }

    // Re-add scripts that were downloaded as assets but whose HTML <script> tags were removed
    // (cleanAndGetHtml strips all msgsndr.com script tags so GHL platform widgets don't run,
    // but this also removes self-contained libs like AOS.js or Swiper.js hosted on GHL's CDN).
    // We recover them here so they're served from /assets/ and still run on Vercel.
    const GHL_PLATFORM_PATTERNS = [
      "/js/form_embed", "form_embed.js", "/widget.js",
      "/chat", "/messenger", "/hl-chat",
      "gohighlevel.com/js", "leadconnectorhq.com/js",
    ];
    const referencedSrcs = new Set(
      parsed.orderedScripts.filter((s) => s.kind === "external").map((s) => s.value)
    );
    const recoveredScripts: ScriptEntry[] = extracted.scripts
      .filter(
        (a) =>
          !referencedSrcs.has(a.originalUrl) &&
          !!a.content &&
          !GHL_PLATFORM_PATTERNS.some((p) => a.originalUrl.includes(p))
      )
      .map((a) => ({ kind: "external" as const, value: a.originalUrl, attrs: {} }));

    // Absolute CDN CSS links to re-add as <link> tags.
    // Covers fonts / icon libs (e.g. Google Fonts) that benefit from CDN subsets.
    // GHL-specific domains are excluded (see GHL_CDN_DOMAINS) — their CSS is already
    // embedded in ghl-styles.css and their signed URLs expire within hours.
    const cdnCssLinks = extracted.externalCssUrls.filter(
      (u) => u.startsWith("http") && !GHL_CDN_DOMAINS.some((d) => u.includes(d))
    );

    const fullHtml = buildStaticHtml(
      headHtml,
      bodyHtml,
      buildScriptTags([...recoveredScripts, ...parsed.orderedScripts], jsUrlMap),
      extracted.metadata.lang ?? "en",
      cdnCssLinks,
      parsed.bodyAttribs,
      parsed.htmlAttribs,
    );

    const files: GeneratedFile[] = [];

    files.push({ path: "index.html", content: fullHtml });
    files.push({ path: "ghl-styles.css", content: buildGhlStylesCss(inlineCss) });
    files.push({ path: "vercel.json", content: generateVercelJson() });

    for (const asset of allAssets) {
      if (asset.content) {
        files.push({
          path: `assets/${path.basename(asset.localPath)}`,
          content: asset.content.toString("base64"),
          encoding: "base64",
        });
      }
    }

    onProgress?.("Proyecto estático generado correctamente.");

    const slug = slugify(projectName);
    return {
      name: slug,
      files,
      packageJson: generateExportedPackageJson(slug),
    };
  }

  async convertSite(
    site: CrawledSite,
    projectName: string,
    onProgress?: (msg: string) => void
  ): Promise<GeneratedProject> {
    onProgress?.(`Convirtiendo sitio (${site.pages.length} páginas)...`);

    // Deduplicate assets across all pages by originalUrl
    const assetMap = new Map<string, ExtractedAsset>();
    for (const { extracted } of site.pages) {
      const allPageAssets = [...extracted.images, ...extracted.fonts, ...extracted.videos, ...extracted.scripts];
      for (const asset of allPageAssets) {
        if (!assetMap.has(asset.originalUrl)) {
          assetMap.set(asset.originalUrl, asset);
        }
      }
    }
    const allAssets = Array.from(assetMap.values());

    // Build JS URL → local path map for script src rewriting
    const jsUrlMap = new Map<string, string>();
    for (const asset of allAssets) {
      if (
        asset.mimeType?.startsWith("text/javascript") ||
        asset.mimeType?.startsWith("application/javascript") ||
        asset.mimeType?.startsWith("application/x-javascript") ||
        asset.mimeType?.includes("ecmascript")
      ) {
        jsUrlMap.set(asset.originalUrl, `/assets/${path.basename(asset.localPath)}`);
      }
    }

    // Collect all CSS from all pages (deduplicate by content hash isn't worth it here)
    const allCss = site.pages.flatMap((p) => p.extracted.css);
    let allInlineCss = allCss.filter((s) => s.trim()).join("\n\n");

    // Collect all unique external CSS URLs across the site
    const allExternalCssUrls = [
      ...new Set(site.pages.flatMap((p) => p.extracted.externalCssUrls)),
    ];

    // Always fetch CSS from external URLs server-side (same reasoning as single-page convert):
    // signed URLs expire, route.fetch() may fail silently, api/fetch has no other CSS source.
    const siteCssUrlsToFetch = allExternalCssUrls.filter(
      (u) =>
        u.startsWith("http") &&
        !u.includes("fonts.googleapis.com") &&
        !u.includes("fonts.gstatic.com")
    );

    if (siteCssUrlsToFetch.length > 0) {
      onProgress?.(`Descargando ${siteCssUrlsToFetch.length} hoja(s) CSS externas del sitio para embed permanente...`);
      const fetched = await Promise.all(siteCssUrlsToFetch.map((url) => fetchExternalCss(url)));
      const fetchedCss = fetched.filter(Boolean).join("\n\n");
      if (fetchedCss) allInlineCss = allInlineCss ? `${allInlineCss}\n\n${fetchedCss}` : fetchedCss;
    }

    const cdnCssLinks = allExternalCssUrls.filter(
      (u) => u.startsWith("http") && !GHL_CDN_DOMAINS.some((d) => u.includes(d))
    );

    const files: GeneratedFile[] = [];

    files.push({ path: "ghl-styles.css", content: buildGhlStylesCss(allInlineCss) });
    files.push({ path: "vercel.json", content: generateVercelJson() });

    // GHL platform script patterns — never re-add these even if downloaded
    const GHL_PLATFORM_PATTERNS_SITE = [
      "/js/form_embed", "form_embed.js", "/widget.js",
      "/chat", "/messenger", "/hl-chat",
      "gohighlevel.com/js", "leadconnectorhq.com/js",
    ];

    // Static HTML page per URL
    for (const { path: urlPath, extracted } of site.pages) {
      const parsed = this.parser.parse(extracted.html);
      const bodyHtml = this.normalizer.rewriteHtmlAssetUrls(
        parsed.cleanBodyHtml || extracted.html,
        allAssets
      );
      const headHtml = this.normalizer.rewriteHtmlAssetUrls(parsed.headContent, allAssets);

      // Re-add scripts downloaded as assets but blocked from this page's HTML
      const pageReferencedSrcs = new Set(
        parsed.orderedScripts.filter((s) => s.kind === "external").map((s) => s.value)
      );
      const pageRecoveredScripts: ScriptEntry[] = extracted.scripts
        .filter(
          (a) =>
            !pageReferencedSrcs.has(a.originalUrl) &&
            !!a.content &&
            !GHL_PLATFORM_PATTERNS_SITE.some((p) => a.originalUrl.includes(p))
        )
        .map((a) => ({ kind: "external" as const, value: a.originalUrl, attrs: {} }));

      const fullHtml = buildStaticHtml(
        headHtml,
        bodyHtml,
        buildScriptTags([...pageRecoveredScripts, ...parsed.orderedScripts], jsUrlMap),
        extracted.metadata.lang ?? "en",
        cdnCssLinks,
        parsed.bodyAttribs,
        parsed.htmlAttribs,
      );

      files.push({
        path: this.pathToHtmlFile(urlPath),
        content: fullHtml,
      });

      onProgress?.(`Página generada: ${urlPath}`);
    }

    // All assets (deduplicated)
    for (const asset of allAssets) {
      if (asset.content) {
        files.push({
          path: `assets/${path.basename(asset.localPath)}`,
          content: asset.content.toString("base64"),
          encoding: "base64",
        });
      }
    }

    onProgress?.(`Proyecto estático generado: ${files.length} archivos.`);

    const slug = slugify(projectName);
    return {
      name: slug,
      files,
      packageJson: generateExportedPackageJson(slug),
    };
  }

  private pathToHtmlFile(urlPath: string): string {
    const normalized = urlPath === "/" || urlPath === "" ? "/" : urlPath.replace(/\/+$/, "");
    if (normalized === "/") return "index.html";
    const segments = normalized.replace(/^\//, "").split("/").map(slugify);
    return `${segments.join("/")}/index.html`;
  }
}

export { ComponentDetector } from "./component-detector";
export { HtmlParser } from "./html-parser";

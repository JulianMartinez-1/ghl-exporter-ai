"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";

const spring = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [hidden, setHidden]       = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const lastScrollY               = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      if (menuOpen) return;
      const currentY = window.scrollY;

      setScrolled(currentY > 40);

      if (currentY <= 0) {
        setHidden(false);
      } else if (currentY > lastScrollY.current + 8 && currentY > 120) {
        setHidden(true);
      } else if (currentY < lastScrollY.current - 8) {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return (
    <motion.header
      /* ── Slide-in on mount, slide-out when hidden ── */
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: hidden ? -100 : 0, opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.4, ease: spring }}
      className={[
        "fixed inset-x-0 top-0 z-50",
        "transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300",
        scrolled
          ? "bg-[#080b12]/92 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-black/40"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      {/* ── Inner bar — height animates on scroll ── */}
      <div
        className={[
          "mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6",
          "transition-[height] duration-300 ease-out",
          scrolled ? "h-[58px]" : "h-[72px]",
        ].join(" ")}
      >
        {/* Logo — shrinks when scrolled */}
        <div
          className={[
            "flex-shrink-0 overflow-hidden",
            "transition-[width] duration-300 ease-out",
            scrolled ? "w-[116px]" : "w-[148px]",
          ].join(" ")}
        >
          <Image
            src="/GO-TO.png"
            alt="Go To Marketing"
            width={148}
            height={66}
            className="object-contain w-full h-auto"
            priority
          />
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {[
            { href: "#como-funciona", label: "Cómo funciona" },
            { href: "#features",      label: "Funciones" },
            { href: "#demo",          label: "Demo" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={[
                "font-medium transition-[color,font-size] duration-300",
                scrolled
                  ? "text-[13px] text-white/50 hover:text-white/90"
                  : "text-sm text-white/50 hover:text-white/90",
              ].join(" ")}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors duration-200"
          >
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>

          <Button
            asChild
            size="sm"
            className={[
              "gap-1.5 font-semibold text-white border-0",
              "bg-amber-500 hover:bg-amber-600",
              "shadow-lg shadow-amber-500/20",
              "transition-all duration-300",
              scrolled ? "px-4 h-8 text-xs" : "px-5 h-9 text-sm",
            ].join(" ")}
          >
            <Link href="/sign-up">
              Comenzar gratis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors touch-manipulation"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {menuOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Menu className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: spring }}
            className="md:hidden overflow-hidden bg-[#080b12]/95 backdrop-blur-2xl border-t border-white/10"
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="flex flex-col gap-1 px-4 py-4"
            >
              {[
                { href: "#como-funciona", label: "Cómo funciona" },
                { href: "#features",      label: "Funciones" },
                { href: "#demo",          label: "Demo" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center h-11 px-3 rounded-xl text-sm font-medium text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors touch-manipulation"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              <div className="flex gap-2 pt-3 border-t border-white/10 mt-1">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-11 text-white/60 hover:text-white hover:bg-white/[0.08] touch-manipulation"
                >
                  <Link href="/sign-in" onClick={() => setMenuOpen(false)}>
                    Iniciar sesión
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white border-0 font-semibold touch-manipulation"
                >
                  <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
                    Comenzar gratis
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

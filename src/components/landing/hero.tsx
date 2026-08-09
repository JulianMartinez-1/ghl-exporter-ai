"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

/* Cubic-bezier suave tipo "spring" */
const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-[72px] pb-24 px-4 sm:px-6 overflow-hidden bg-[#0a0d14]">

      {/* ── Glows de fondo animados ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[560px] w-[860px] rounded-full bg-amber-500/[0.07] blur-[120px]"
        />
        <motion.div
          animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          className="absolute top-1/3 left-1/4 h-[280px] w-[280px] rounded-full bg-amber-600/[0.05] blur-[80px]"
        />
        <motion.div
          animate={{ y: [0, 14, 0], x: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          className="absolute top-1/3 right-1/4 h-[280px] w-[280px] rounded-full bg-orange-500/[0.05] blur-[80px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[180px] w-[480px] rounded-full bg-amber-400/[0.06] blur-[100px]"
        />
      </div>

      {/* Grilla de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Contenido principal ── */}
      <div className="relative mx-auto max-w-4xl text-center w-full">

        {/* Badge — entra primero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 tracking-wide">
            API First · Playwright Fallback · Deploy automático
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22, ease }}
          className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.08]"
        >
          Exporta GoHighLevel{" "}
          <span className="text-gradient-gold block sm:inline">a Next.js</span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.36, ease }}
          className="mt-7 text-lg text-white/55 max-w-2xl mx-auto leading-relaxed"
        >
          Conecta tu cuenta de GHL, selecciona un Funnel o Website, y obtén un
          proyecto Next.js listo para producción —{" "}
          <span className="text-white/80">desplegado en Vercel en minutos</span>.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48, ease }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            asChild
            size="lg"
            className="gap-2 px-10 text-sm font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white border-0 shadow-xl shadow-amber-500/25 h-12 transition-all duration-200"
          >
            <Link href="/sign-up">
              Empezar gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="px-10 text-sm font-semibold border-white/15 text-white/65 hover:bg-white/[0.08] hover:text-white hover:border-white/25 bg-transparent h-12 transition-all duration-200"
          >
            <a href="#demo">Ver demo</a>
          </Button>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.62, ease }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/30"
        >
          <span className="flex items-center gap-1.5">
            {/* Punto verde pulsante — CSS puro para máxima fiabilidad */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            Sin tarjeta de crédito
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span>Setup en menos de 2 min</span>
          <span className="h-3 w-px bg-white/10" />
          <span>Cancela cuando quieras</span>
        </motion.div>

        {/* ── Mockup del dashboard — blur-in ── */}
        <motion.div
          initial={{ opacity: 0, y: 56, filter: "blur(16px)", scale: 1.04 }}
          animate={{ opacity: 1, y: 0,  filter: "blur(0px)",  scale: 1 }}
          transition={{ duration: 1.4, delay: 0.78, ease }}
          className="mt-16 relative mx-auto max-w-4xl"
        >
          {/* Anillo pulsante detrás */}
          <motion.div
            animate={{ scale: [1, 1.04, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-3 rounded-3xl bg-amber-500/[0.04] blur-2xl pointer-events-none"
          />

          {/* Browser chrome */}
          <div className="relative rounded-2xl border border-white/[0.09] bg-[#111520] shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden">

            {/* Barra del navegador */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1018] border-b border-white/[0.07]">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex-1 mx-4 h-6 rounded-md bg-white/[0.05] flex items-center px-3">
                <span className="text-[10px] text-white/25">ghl-exporter.vercel.app/dashboard</span>
              </div>
            </div>

            {/* Dashboard preview */}
            <div className="grid grid-cols-4 h-[280px] sm:h-[340px]">

              {/* Sidebar */}
              <div className="col-span-1 bg-[#0e1320] border-r border-white/[0.07] p-4">
                <div className="h-6 w-20 rounded bg-amber-500/20 mb-6" />
                {["Dashboard", "Exportar", "Proyectos", "Logs"].map((label, i) => (
                  <div
                    key={label}
                    className={`h-7 rounded-lg mb-1.5 flex items-center px-2 ${
                      i === 1
                        ? "bg-amber-500/15 border border-amber-500/20"
                        : "bg-white/[0.03]"
                    }`}
                  >
                    <div className={`h-2 rounded ${i === 1 ? "w-12 bg-amber-400/60" : "w-10 bg-white/20"}`} />
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="col-span-3 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-32 rounded bg-white/15" />
                  <div className="h-7 w-24 rounded-lg bg-amber-500/30" />
                </div>

                {/* Barra de progreso animada */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 w-28 rounded bg-white/20" />
                    <div className="h-3 w-10 rounded bg-amber-400/40" />
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: "72%" }}
                      transition={{ duration: 1.6, delay: 1.8, ease }}
                      className="h-full rounded-full gradient-gold"
                    />
                  </div>
                  <div className="mt-2 h-2 w-20 rounded bg-white/10" />
                </div>

                {/* Lista de items escalonados */}
                <div className="space-y-2">
                  {[85, 65, 45].map((w, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 2.1 + i * 0.14, ease }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                    >
                      <div className="h-6 w-6 rounded-md bg-amber-500/20 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 rounded bg-white/20" style={{ width: `${w}%` }} />
                        <div className="h-1.5 w-16 rounded bg-white/10" />
                      </div>
                      <div className="h-5 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/20" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Glow debajo del mockup */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-14 w-2/3 bg-amber-500/[0.12] blur-2xl rounded-full pointer-events-none"
          />
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion, type Variants } from "framer-motion";
import {
  Zap,
  Code,
  Globe,
  GitBranch,
  Bot,
  Shield,
  Palette,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "API First",
    description:
      "Usa la API oficial de GHL primero. Playwright solo entra cuando la API no puede proveer el HTML completo.",
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-100",
  },
  {
    icon: Code,
    title: "Next.js 15 limpio",
    description:
      "Proyecto generado con App Router, TypeScript, componentes separados y Tailwind CSS. Listo para escalar.",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-100",
  },
  {
    icon: Globe,
    title: "Deploy automático",
    description:
      "Vercel detecta el push y despliega en segundos. Obtienes una URL de producción inmediata.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 border-emerald-100",
  },
  {
    icon: GitBranch,
    title: "GitHub incluido",
    description:
      "Repositorio creado automáticamente con commit inicial, README profesional y estructura modular.",
    color: "text-purple-500",
    bg: "bg-purple-50 border-purple-100",
  },
  {
    icon: Bot,
    title: "Playwright fallback",
    description:
      "Si Cloudflare bloquea o la API no responde, Playwright renderiza y captura la página completa con todos sus assets.",
    color: "text-rose-500",
    bg: "bg-rose-50 border-rose-100",
  },
  {
    icon: Shield,
    title: "OAuth 2.0 seguro",
    description:
      "Autenticación con GHL vía OAuth. Tokens cifrados, rate limiting y validación estricta con Zod.",
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-100",
  },
  {
    icon: Palette,
    title: "CSS fiel al original",
    description:
      "Captura fuentes, variables CSS, estilos externos y breakpoints para que la página se vea idéntica.",
    color: "text-pink-500",
    bg: "bg-pink-50 border-pink-100",
  },
  {
    icon: BarChart3,
    title: "Logs en tiempo real",
    description:
      "Visualiza cada paso del proceso de exportación con un terminal integrado y trazas detalladas.",
    color: "text-orange-500",
    bg: "bg-orange-50 border-orange-100",
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-widest text-amber-600">
            Funciones
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Todo automático. Cero configuración.
          </h2>
          <p className="mt-4 text-base text-gray-500 max-w-xl mx-auto">
            El sistema decide cómo extraer. Tú solo eliges qué exportar.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-20px" }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={card}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group rounded-2xl border bg-white p-5 card-shadow hover:card-shadow-hover cursor-default"
              >
                <div className={`mb-4 inline-flex rounded-xl border p-2.5 ${feature.bg}`}>
                  <Icon className={`h-4 w-4 ${feature.color}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

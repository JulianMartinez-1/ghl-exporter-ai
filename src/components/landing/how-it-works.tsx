"use client";

import { motion, type Variants } from "framer-motion";
import { Link2, ScanSearch, Rocket } from "lucide-react";

const steps = [
  {
    icon: Link2,
    number: "01",
    title: "Conecta GoHighLevel",
    description:
      "Autentícate con OAuth 2.0. Tus tokens se cifran y almacenan de forma segura. Solo necesitas hacerlo una vez.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: ScanSearch,
    number: "02",
    title: "Selecciona y exporta",
    description:
      "Elige cualquier Funnel o Website de GHL. El sistema extrae el HTML, CSS, imágenes y fuentes automáticamente vía API + Playwright.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Deploy en Vercel",
    description:
      "Se crea un repo en GitHub con tu proyecto Next.js 15 y se despliega en Vercel automáticamente. Listo para producción.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-4 sm:px-6 bg-[#f7f7f8]">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-widest text-amber-600">
            Proceso
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            De GHL a producción en 3 pasos
          </h2>
          <p className="mt-4 text-base text-gray-500 max-w-xl mx-auto">
            Sin configuración manual, sin código a escribir. El sistema se encarga de todo.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-20px" }}
          className="relative grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-[52px] left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-amber-200 via-blue-200 to-emerald-200" />

          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.number} variants={card} className="relative">
                {/* Number badge */}
                <div className={`relative z-10 mb-6 inline-flex items-center justify-center h-14 w-14 rounded-2xl border ${step.bg}`}>
                  <Icon className={`h-6 w-6 ${step.color}`} />
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-400 flex items-center justify-center shadow-sm">
                    {step.number.slice(1)}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { motion, type Variants } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Carlos Mendoza",
    role: "Agencia GHL · México",
    avatar: "CM",
    rating: 5,
    quote:
      "Exporté 12 funnels en una tarde. El CSS quedó perfecto en todos y el deploy en Vercel fue automático. Increíble herramienta.",
  },
  {
    name: "Laura Sánchez",
    role: "Marketing Manager · Colombia",
    avatar: "LS",
    rating: 5,
    quote:
      "Mis clientes quieren páginas rápidas y en Next.js. Con GHL Exporter lo logro en minutos, no días. El fallback con Playwright es genial.",
  },
  {
    name: "Andrés Rivas",
    role: "Desarrollador Freelance · España",
    avatar: "AR",
    rating: 5,
    quote:
      "El código generado es limpio y listo para escalar. TypeScript, App Router, todo. Se nota que fue hecho por alguien que sabe Next.js.",
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export function Testimonials() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-[#f7f7f8]">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-widest text-amber-600">
            Testimonios
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Lo que dicen nuestros usuarios
          </h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-20px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={card}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-gray-200 bg-white p-6 card-shadow hover:card-shadow-hover"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <blockquote className="text-sm text-gray-600 leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{t.name}</div>
                  <div className="text-[11px] text-gray-400">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

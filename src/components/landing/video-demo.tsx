"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Play } from "lucide-react";

// Reemplaza DEMO_VIDEO_ID con el ID real del video de YouTube
const YOUTUBE_VIDEO_ID = "DEMO_VIDEO_ID";

export function VideoDemo() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo" className="py-24 px-4 sm:px-6 bg-[#0a0d14]">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-widest text-amber-500">
            Demo
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Míralo en acción
          </h2>
          <p className="mt-4 text-base text-white/45 max-w-xl mx-auto">
            De una URL de GoHighLevel a un proyecto Next.js desplegado en Vercel — en menos de 5 minutos.
          </p>
        </motion.div>

        {/* Video player */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#0d1018] border-b border-white/8">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/70" />
              <div className="h-3 w-3 rounded-full bg-amber-500/70" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
            </div>
            <div className="flex-1 mx-4 h-6 rounded-md bg-white/5 flex items-center px-3">
              <span className="text-[10px] text-white/25">Demo — GHL Exporter AI</span>
            </div>
          </div>

          {/* Video area */}
          <div className="relative aspect-video bg-[#050709]">
            {!playing ? (
              /* Thumbnail / Play button */
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                onClick={() => setPlaying(true)}
              >
                {/* Gradient overlay thumbnail */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-[#050709] to-[#050709]" />

                {/* Play button */}
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 shadow-2xl shadow-amber-500/40 border-4 border-amber-400/50"
                >
                  <Play className="h-8 w-8 text-white fill-white ml-1" />
                </motion.div>

                {/* Animated rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    className="h-20 w-20 rounded-full bg-amber-500/30"
                  />
                </div>

                <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/40">
                  Haz clic para reproducir el demo
                </p>
              </div>
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0`}
                title="GHL Exporter AI Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </motion.div>

        {/* Features under video */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center"
        >
          {[
            { label: "Extracción completa", desc: "HTML, CSS, fuentes e imágenes" },
            { label: "Generación Next.js", desc: "Proyecto listo para Vercel" },
            { label: "Deploy automático", desc: "GitHub + Vercel en un clic" },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border border-white/8 bg-white/4 p-4">
              <div className="text-xs font-semibold text-white/80 mb-1">{f.label}</div>
              <div className="text-[11px] text-white/35">{f.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

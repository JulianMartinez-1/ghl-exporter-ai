"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const perks = [
  "Sin tarjeta de crédito",
  "Exportaciones ilimitadas en el plan Pro",
  "Soporte en español",
  "Cancela cuando quieras",
];

export function CtaSection() {
  return (
    <section className="relative py-28 px-4 sm:px-6 bg-[#0a0d14] overflow-hidden">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-8">
            <Image
              src="/GO-TO.png"
              alt="Go To Marketing"
              width={160}
              height={72}
              className="object-contain"
            />
          </div>

          <h2 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
            Empieza a exportar hoy
          </h2>
          <p className="mt-4 text-base text-white/45 max-w-md mx-auto">
            Conecta GoHighLevel en menos de 2 minutos y exporta tu primer Funnel gratis.
          </p>

          <Button
            asChild
            size="lg"
            className="mt-10 gap-2 w-full sm:w-auto px-12 font-bold bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-xl shadow-amber-500/25 h-12 text-base"
          >
            <Link href="/sign-up">
              Crear cuenta gratuita
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-1.5 text-xs text-white/40">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                {perk}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

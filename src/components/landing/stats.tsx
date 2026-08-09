"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

const stats = [
  { value: "500+",   label: "Funnels exportados" },
  { value: "99.9%",  label: "Uptime garantizado" },
  { value: "< 5min", label: "Deploy promedio" },
  { value: "100%",   label: "Next.js nativo" },
];

function parseStat(raw: string) {
  const m = raw.match(/^([^0-9]*)(\d+\.?\d*)(.*)$/);
  if (!m) return { prefix: "", target: 0, suffix: raw, decimals: 0 };
  const [, prefix, num, suffix] = m;
  return {
    prefix,
    target:   parseFloat(num),
    suffix,
    decimals: num.includes(".") ? num.split(".")[1].length : 0,
  };
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function Counter({ value, label, index }: { value: string; label: string; index: number }) {
  const ref                          = useRef<HTMLDivElement>(null);
  const [visible, setVisible]        = useState(false);
  const [display, setDisplay]        = useState("0");
  const { prefix, target, suffix, decimals } = parseStat(value);

  /* IntersectionObserver nativo — sin dependencia de framer-motion */
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* requestAnimationFrame counter — sin useMotionValue ni animate() */
  useEffect(() => {
    if (!visible) return;

    const DURATION = 2200;
    const DELAY    = index * 160;
    let startTs: number | null = null;
    let raf: number;

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed  = ts - startTs - DELAY;
      if (elapsed < 0) { raf = requestAnimationFrame(tick); return; }

      const progress = Math.min(elapsed / DURATION, 1);
      const value    = easeOutExpo(progress) * target;

      setDisplay(
        decimals > 0
          ? value.toFixed(decimals)
          : String(Math.floor(value))
      );

      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, target, decimals, index]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
      className="text-center"
    >
      <div className="text-3xl font-extrabold text-gradient-gold tracking-tight tabular-nums">
        {prefix}{display}{suffix}
      </div>
      <div className="mt-1.5 text-xs text-white/40 font-medium">{label}</div>
    </motion.div>
  );
}

export function Stats() {
  return (
    <section className="relative py-14 bg-[#0d1018] border-y border-white/[0.08]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <Counter key={stat.label} value={stat.value} label={stat.label} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

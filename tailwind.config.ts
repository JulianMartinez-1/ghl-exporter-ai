import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      /* Custom easing functions */
      transitionTimingFunction: {
        "in-expo":     "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "out-expo":    "cubic-bezier(0.19, 1, 0.22, 1)",
        "in-out-expo": "cubic-bezier(0.87, 0, 0.13, 1)",
        spring:        "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        bounce:        "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        smooth:        "cubic-bezier(0.4, 0, 0.2, 1)",
        snappy:        "cubic-bezier(0.2, 0, 0, 1)",
      },
      /* Extra transition durations */
      transitionDuration: {
        "400":  "400ms",
        "600":  "600ms",
        "800":  "800ms",
        "900":  "900ms",
        "1200": "1200ms",
        "1500": "1500ms",
        "2000": "2000ms",
        "3000": "3000ms",
      },
      keyframes: {
        /* ── Accordion (shadcn/ui) ── */
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },

        /* ── Fade variants ── */
        "fade-in":       { from: { opacity: "0" },                                           to: { opacity: "1" } },
        "fade-in-up":    { from: { opacity: "0", transform: "translateY(24px)" },             to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in-down":  { from: { opacity: "0", transform: "translateY(-24px)" },            to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in-left":  { from: { opacity: "0", transform: "translateX(24px)" },             to: { opacity: "1", transform: "translateX(0)" } },
        "fade-in-right": { from: { opacity: "0", transform: "translateX(-24px)" },            to: { opacity: "1", transform: "translateX(0)" } },
        "fade-out":      { from: { opacity: "1" },                                           to: { opacity: "0" } },
        "fade-out-down": { from: { opacity: "1", transform: "translateY(0)" },                to: { opacity: "0", transform: "translateY(24px)" } },
        "fade-out-up":   { from: { opacity: "1", transform: "translateY(0)" },                to: { opacity: "0", transform: "translateY(-24px)" } },

        /* ── Blur-to-focus (imagen que aparece borrosa → nítida) ── */
        "blur-in": {
          from: { opacity: "0", filter: "blur(16px)", transform: "scale(1.04)" },
          to:   { opacity: "1", filter: "blur(0px)",  transform: "scale(1)" },
        },
        "blur-in-sm": {
          from: { opacity: "0", filter: "blur(8px)" },
          to:   { opacity: "1", filter: "blur(0px)" },
        },
        "blur-out": {
          from: { opacity: "1", filter: "blur(0px)" },
          to:   { opacity: "0", filter: "blur(16px)" },
        },

        /* ── Scale ── */
        "scale-in":  { from: { opacity: "0", transform: "scale(0.92)" }, to: { opacity: "1", transform: "scale(1)" } },
        "scale-out": { from: { opacity: "1", transform: "scale(1)" },    to: { opacity: "0", transform: "scale(0.92)" } },
        "zoom-in":   { from: { opacity: "0", transform: "scale(0)" },    to: { opacity: "1", transform: "scale(1)" } },
        "zoom-out":  { from: { opacity: "1", transform: "scale(1)" },    to: { opacity: "0", transform: "scale(0)" } },

        /* ── Slide (desde los bordes) ── */
        "slide-up":          { from: { transform: "translateY(100%)" },  to: { transform: "translateY(0)" } },
        "slide-down":        { from: { transform: "translateY(-100%)" }, to: { transform: "translateY(0)" } },
        "slide-left":        { from: { transform: "translateX(100%)" },  to: { transform: "translateX(0)" } },
        "slide-right":       { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "slide-up-fade":     { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-down-fade":   { from: { opacity: "0", transform: "translateY(-16px)" }, to: { opacity: "1", transform: "translateY(0)" } },

        /* ── Float (levitación) ── */
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%":      { transform: "translateY(-8px) rotate(1deg)" },
          "66%":      { transform: "translateY(-4px) rotate(-1deg)" },
        },
        "float-x": {
          "0%, 100%": { transform: "translateX(0px)" },
          "50%":      { transform: "translateX(10px)" },
        },

        /* ── Shimmer (skeleton loading) ── */
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },

        /* ── Gradient shift (fondos animados) ── */
        "gradient-shift": {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },

        /* ── Glow pulse (luz ambiental) ── */
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(245,158,11,0.3), 0 0 40px rgba(245,158,11,0.1)" },
          "50%":      { boxShadow: "0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.2)" },
        },
        "glow-pulse-white": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255,255,255,0.08)" },
          "50%":      { boxShadow: "0 0 40px rgba(255,255,255,0.22)" },
        },
        "glow-pulse-blue": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59,130,246,0.3)" },
          "50%":      { boxShadow: "0 0 40px rgba(59,130,246,0.6)" },
        },

        /* ── Bounce suave ── */
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0px)",   animationTimingFunction: "cubic-bezier(0.8,0,1,1)" },
          "50%":      { transform: "translateY(-10px)", animationTimingFunction: "cubic-bezier(0,0,0.2,1)" },
        },

        /* ── Attention seekers ── */
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "20%":      { transform: "rotate(-8deg)" },
          "40%":      { transform: "rotate(8deg)" },
          "60%":      { transform: "rotate(-4deg)" },
          "80%":      { transform: "rotate(4deg)" },
        },
        shake: {
          "0%, 100%":      { transform: "translateX(0)" },
          "15%, 45%, 75%": { transform: "translateX(-6px)" },
          "30%, 60%, 90%": { transform: "translateX(6px)" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "14%":      { transform: "scale(1.15)" },
          "28%":      { transform: "scale(1)" },
          "42%":      { transform: "scale(1.15)" },
          "70%":      { transform: "scale(1)" },
        },
        tada: {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "10%, 20%": { transform: "scale(0.9) rotate(-3deg)" },
          "30%, 50%, 70%, 90%": { transform: "scale(1.1) rotate(3deg)" },
          "40%, 60%, 80%":      { transform: "scale(1.1) rotate(-3deg)" },
        },

        /* ── 3D Flips ── */
        "flip-x": {
          from: { transform: "perspective(600px) rotateX(90deg)", opacity: "0" },
          to:   { transform: "perspective(600px) rotateX(0deg)",  opacity: "1" },
        },
        "flip-y": {
          from: { transform: "perspective(600px) rotateY(90deg)", opacity: "0" },
          to:   { transform: "perspective(600px) rotateY(0deg)",  opacity: "1" },
        },
        "flip-3d": {
          "0%":   { transform: "perspective(800px) rotateY(-90deg)", opacity: "0" },
          "100%": { transform: "perspective(800px) rotateY(0deg)",   opacity: "1" },
        },

        /* ── Elastic / físicas ── */
        "rubber-band": {
          "0%":   { transform: "scale(1)" },
          "30%":  { transform: "scaleX(1.25) scaleY(0.75)" },
          "40%":  { transform: "scaleX(0.75) scaleY(1.25)" },
          "50%":  { transform: "scaleX(1.15) scaleY(0.85)" },
          "65%":  { transform: "scaleX(0.95) scaleY(1.05)" },
          "75%":  { transform: "scaleX(1.05) scaleY(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        jello: {
          "0%, 11.1%, 100%": { transform: "skewX(0deg) skewY(0deg)" },
          "22.2%":           { transform: "skewX(-12.5deg) skewY(-12.5deg)" },
          "33.3%":           { transform: "skewX(6.25deg) skewY(6.25deg)" },
          "44.4%":           { transform: "skewX(-3.125deg) skewY(-3.125deg)" },
          "55.5%":           { transform: "skewX(1.5625deg) skewY(1.5625deg)" },
          "66.6%":           { transform: "skewX(-0.78125deg) skewY(-0.78125deg)" },
          "77.7%":           { transform: "skewX(0.390625deg) skewY(0.390625deg)" },
          "88.8%":           { transform: "skewX(-0.1953125deg) skewY(-0.1953125deg)" },
        },

        /* ── Morphing shape ── */
        morph: {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "50%":      { borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" },
        },

        /* ── Marquee / scroll horizontal/vertical ── */
        marquee: {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to:   { transform: "translateY(-50%)" },
        },

        /* ── Clip-path reveal ── */
        "reveal-right": {
          from: { clipPath: "inset(0 100% 0 0)" },
          to:   { clipPath: "inset(0 0% 0 0)" },
        },
        "reveal-up": {
          from: { clipPath: "inset(100% 0 0 0)" },
          to:   { clipPath: "inset(0 0 0 0)" },
        },
        "reveal-left": {
          from: { clipPath: "inset(0 0 0 100%)" },
          to:   { clipPath: "inset(0 0 0 0)" },
        },

        /* ── Spin variants ── */
        "spin-slow":    { from: { transform: "rotate(0deg)" },  to: { transform: "rotate(360deg)" } },
        "spin-reverse": { from: { transform: "rotate(0deg)" },  to: { transform: "rotate(-360deg)" } },

        /* ── Ripple / expandir anillo ── */
        ripple: {
          "0%":   { transform: "scale(1)",   opacity: "0.6" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
        "ripple-sm": {
          "0%":   { transform: "scale(1)",   opacity: "0.4" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },

        /* ── Orbit (planeta) ── */
        orbit: {
          from: { transform: "rotate(0deg) translateX(60px) rotate(0deg)" },
          to:   { transform: "rotate(360deg) translateX(60px) rotate(-360deg)" },
        },

        /* ── Glitch ── */
        glitch: {
          "0%, 100%": { transform: "translate(0)",        clipPath: "inset(0 0 0 0)" },
          "20%":      { transform: "translate(-3px, 1px)", clipPath: "inset(20% 0 30% 0)" },
          "40%":      { transform: "translate(3px, -1px)", clipPath: "inset(60% 0 10% 0)" },
          "60%":      { transform: "translate(-2px, 2px)", clipPath: "inset(40% 0 50% 0)" },
          "80%":      { transform: "translate(2px, -1px)", clipPath: "inset(10% 0 80% 0)" },
        },

        /* ── Typewriter ── */
        typewriter: {
          from: { width: "0" },
          to:   { width: "100%" },
        },

        /* ── Cursor blink ── */
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },

        /* ── Roll in ── */
        "roll-in": {
          from: { opacity: "0", transform: "translateX(-100%) rotate(-120deg)" },
          to:   { opacity: "1", transform: "translateX(0) rotate(0deg)" },
        },

        /* ── Swing (péndulo) ── */
        swing: {
          "20%":  { transform: "rotate(15deg)" },
          "40%":  { transform: "rotate(-10deg)" },
          "60%":  { transform: "rotate(5deg)" },
          "80%":  { transform: "rotate(-5deg)" },
          "100%": { transform: "rotate(0deg)" },
        },

        /* ── Shine sweep (destello de luz) ── */
        shine: {
          "0%":   { left: "-100%" },
          "100%": { left: "200%" },
        },

        /* ── SVG stroke draw ── */
        draw: {
          from: { strokeDashoffset: "1000" },
          to:   { strokeDashoffset: "0" },
        },

        /* ── Pulsating dot ── */
        "ping-soft": {
          "75%, 100%": { transform: "scale(1.8)", opacity: "0" },
        },

        /* ── Fade + scale (modal enter) ── */
        "pop-in": {
          "0%":   { opacity: "0", transform: "scale(0.85)" },
          "70%":  { transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pop-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to:   { opacity: "0", transform: "scale(0.85)" },
        },

        /* ── Neon flicker ── */
        "neon-flicker": {
          "0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%": {
            textShadow: "0 0 5px #f59e0b, 0 0 10px #f59e0b, 0 0 20px #f59e0b",
          },
          "20%, 24%, 55%": { textShadow: "none" },
        },

        /* ── Ticker (contador animado) ── */
        "ticker-up": {
          "0%":   { transform: "translateY(0%)" },
          "100%": { transform: "translateY(-100%)" },
        },

        /* ── Sway (vaivén suave) ── */
        sway: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%":      { transform: "rotate(3deg)" },
        },

        /* ── Breathe (scale suave infinito) ── */
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.06)" },
        },

        /* ── Wipe (transición de página) ── */
        "wipe-right": {
          from: { transform: "translateX(-100%)" },
          to:   { transform: "translateX(0)" },
        },

        /* ── Color shift (para bordes/fondos) ── */
        "color-shift": {
          "0%":   { borderColor: "hsl(38 88% 46%)" },
          "33%":  { borderColor: "hsl(220 88% 60%)" },
          "66%":  { borderColor: "hsl(280 88% 65%)" },
          "100%": { borderColor: "hsl(38 88% 46%)" },
        },
      },
      animation: {
        /* ── shadcn/ui ── */
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",

        /* ── Fade ── */
        "fade-in":       "fade-in 0.5s ease-out both",
        "fade-in-up":    "fade-in-up 0.6s ease-out both",
        "fade-in-down":  "fade-in-down 0.6s ease-out both",
        "fade-in-left":  "fade-in-left 0.6s ease-out both",
        "fade-in-right": "fade-in-right 0.6s ease-out both",
        "fade-out":      "fade-out 0.4s ease-in both",
        "fade-out-down": "fade-out-down 0.4s ease-in both",
        "fade-out-up":   "fade-out-up 0.4s ease-in both",

        /* ── Blur-to-focus ── */
        "blur-in":    "blur-in 0.9s cubic-bezier(0.25,0.46,0.45,0.94) both",
        "blur-in-sm": "blur-in-sm 0.6s ease-out both",
        "blur-out":   "blur-out 0.5s ease-in both",

        /* ── Scale ── */
        "scale-in":  "scale-in 0.5s ease-out both",
        "scale-out": "scale-out 0.4s ease-in both",
        "zoom-in":   "zoom-in 0.4s ease-out both",
        "zoom-out":  "zoom-out 0.4s ease-in both",

        /* ── Slide ── */
        "slide-up":        "slide-up 0.4s ease-out both",
        "slide-down":      "slide-down 0.4s ease-out both",
        "slide-left":      "slide-left 0.4s ease-out both",
        "slide-right":     "slide-right 0.4s ease-out both",
        "slide-up-fade":   "slide-up-fade 0.5s ease-out both",
        "slide-down-fade": "slide-down-fade 0.5s ease-out both",

        /* ── Continuous ── */
        float:               "float 4s ease-in-out infinite",
        "float-slow":        "float-slow 6s ease-in-out infinite",
        "float-x":           "float-x 5s ease-in-out infinite",
        shimmer:             "shimmer 2.5s linear infinite",
        "gradient-shift":    "gradient-shift 6s ease infinite",
        "gradient-x":        "gradient-x 4s ease infinite",
        "glow-pulse":        "glow-pulse 2.5s ease-in-out infinite",
        "glow-pulse-white":  "glow-pulse-white 3s ease-in-out infinite",
        "glow-pulse-blue":   "glow-pulse-blue 2.5s ease-in-out infinite",
        sway:                "sway 3s ease-in-out infinite",
        breathe:             "breathe 4s ease-in-out infinite",
        morph:               "morph 8s ease-in-out infinite",
        orbit:               "orbit 8s linear infinite",
        marquee:             "marquee 20s linear infinite",
        "marquee-vertical":  "marquee-vertical 20s linear infinite",
        "spin-slow":         "spin-slow 12s linear infinite",
        "spin-reverse":      "spin-reverse 8s linear infinite",
        ripple:              "ripple 1.5s ease-out infinite",
        "ripple-sm":         "ripple-sm 1.5s ease-out infinite",
        heartbeat:           "heartbeat 1.5s ease-in-out infinite",
        "bounce-soft":       "bounce-soft 2s infinite",
        "neon-flicker":      "neon-flicker 3s infinite",
        "ping-soft":         "ping-soft 1.5s cubic-bezier(0,0,0.2,1) infinite",
        "color-shift":       "color-shift 4s linear infinite",

        /* ── One-shot ── */
        "blur-in-hero":  "blur-in 1.2s cubic-bezier(0.25,0.46,0.45,0.94) both",
        "pop-in":        "pop-in 0.5s cubic-bezier(0.25,0.46,0.45,0.94) both",
        "pop-out":       "pop-out 0.3s ease-in both",
        "flip-x":        "flip-x 0.6s ease-out both",
        "flip-y":        "flip-y 0.6s ease-out both",
        "flip-3d":       "flip-3d 0.7s ease-out both",
        "rubber-band":   "rubber-band 0.8s ease-out",
        jello:           "jello 0.8s ease-in-out both",
        wiggle:          "wiggle 0.7s ease-in-out",
        shake:           "shake 0.5s ease-in-out",
        tada:            "tada 0.9s ease-in-out both",
        "roll-in":       "roll-in 0.6s ease-out both",
        swing:           "swing 0.6s ease-out both",
        glitch:          "glitch 0.4s ease-in-out",
        typewriter:      "typewriter 3s steps(40) both",
        blink:           "blink 1s step-end infinite",
        "reveal-right":  "reveal-right 0.8s cubic-bezier(0.77,0,0.175,1) both",
        "reveal-up":     "reveal-up 0.8s cubic-bezier(0.77,0,0.175,1) both",
        "reveal-left":   "reveal-left 0.8s cubic-bezier(0.77,0,0.175,1) both",
        shine:           "shine 1.5s ease-in-out",
        draw:            "draw 2s ease forwards",
        "wipe-right":    "wipe-right 0.5s ease-out both",
        "ticker-up":     "ticker-up 0.3s ease-in-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

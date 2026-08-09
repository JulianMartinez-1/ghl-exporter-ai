"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#060810] py-10 px-4 border-t border-white/5">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/GO-TO.png"
              alt="Go To Marketing"
              width={100}
              height={44}
              className="object-contain opacity-60"
            />
          </div>

          <nav className="flex items-center gap-6">
            <Link href="/sign-in" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/sign-up" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Registrarse
            </Link>
            <a href="#como-funciona" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Cómo funciona
            </a>
            <a href="#demo" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Demo
            </a>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[11px] text-white/20">
            © {new Date().getFullYear()} GHL Exporter AI — Go To Marketing. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

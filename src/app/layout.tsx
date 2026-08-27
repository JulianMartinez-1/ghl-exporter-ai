import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHL → GitHub Exporter",
  description: "Clona un sitio o funnel de GoHighLevel a un repositorio de GitHub, listo para hostear.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

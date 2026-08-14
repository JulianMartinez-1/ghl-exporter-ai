import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHL Exporter AI",
  description: "Exporta tus Funnels y Websites de GoHighLevel a Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}

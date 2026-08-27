"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExportSummary {
  id: string;
  url: string;
  name: string;
  status: string;
  progress: number;
  pagesCount: number | null;
  githubRepoUrl: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En cola",
  EXTRACTING: "Extrayendo",
  CONVERTING: "Convirtiendo",
  PUSHING_TO_GITHUB: "Subiendo a GitHub",
  COMPLETED: "Completado",
  FAILED: "Con errores",
};

function statusVariant(status: string): "success" | "destructive" | "secondary" | "info" {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "info";
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exports, setExports] = useState<ExportSummary[]>([]);

  const loadExports = async () => {
    try {
      const res = await fetch("/api/exports");
      const json = await res.json();
      if (json.success) setExports(json.data);
    } catch {
      /* silent — the history list is a nice-to-have */
    }
  };

  useEffect(() => {
    loadExports();
    const interval = setInterval(loadExports, 4000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message ?? "No se pudo iniciar el clonado.");
        setSubmitting(false);
        return;
      }
      router.push(`/exports/${json.data.id}`);
    } catch {
      setError("No se pudo conectar con el servidor.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/GO-TO.png" alt="GO TO Marketing" className="h-8 w-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">GHL → GitHub Exporter</p>
            <p className="text-xs text-muted-foreground">Clona un sitio de GoHighLevel, tal cual, a un repo listo para hostear.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Clonar sitio de GoHighLevel</CardTitle>
            <CardDescription>
              Pega el link público del funnel o sitio. Vamos a rastrear todas sus páginas,
              generar un sitio estático idéntico y crear un repositorio nuevo en GitHub.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tucliente.gohighlevelsite.com"
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={submitting}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? "Iniciando..." : "Clonar y subir a GitHub"}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Exportaciones recientes</h2>
          {exports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no has clonado ningún sitio.</p>
          ) : (
            <div className="space-y-2">
              {exports.map((exp) => (
                <a
                  key={exp.id}
                  href={`/exports/${exp.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{exp.url}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exp.createdAt).toLocaleString("es")}
                      {exp.pagesCount ? ` · ${exp.pagesCount} página(s)` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(exp.status)} className="ml-3 shrink-0">
                    {STATUS_LABEL[exp.status] ?? exp.status}
                  </Badge>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

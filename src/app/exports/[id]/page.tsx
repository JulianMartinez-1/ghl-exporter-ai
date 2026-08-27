"use client";

import { useEffect, useRef, useState, use as usePromise, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface ExportLog {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

interface ExportDetail {
  id: string;
  url: string;
  name: string;
  status: string;
  progress: number;
  pagesCount: number | null;
  githubRepoUrl: string | null;
  githubRepoName: string | null;
  zipPath: string | null;
  errorMessage: string | null;
  logs: ExportLog[];
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

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

export default function ExportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [data, setData] = useState<ExportDetail | null>(null);
  const [rawHtml, setRawHtml] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      const res = await fetch(`/api/exports/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (!stopped && json.success) setData(json.data);
    };

    load();
    const interval = setInterval(() => {
      if (data && TERMINAL_STATUSES.has(data.status)) return;
      load();
    }, 2000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, data?.status]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.logs.length]);

  const onRetry = async (e: FormEvent) => {
    e.preventDefault();
    setRetryError(null);
    setRetrying(true);
    try {
      const res = await fetch(`/api/exports/${id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawHtml }),
      });
      const json = await res.json();
      if (!json.success) {
        setRetryError(json.message ?? "No se pudo reintentar.");
        setRetrying(false);
        return;
      }
      setRawHtml("");
    } finally {
      setRetrying(false);
    }
  };

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-sm font-semibold text-foreground hover:underline">
            ← GHL → GitHub Exporter
          </Link>
          <Badge variant={statusVariant(data.status)}>{STATUS_LABEL[data.status] ?? data.status}</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="truncate text-lg">{data.url}</CardTitle>
            <CardDescription>
              {data.pagesCount ? `${data.pagesCount} página(s) · ` : ""}
              {data.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={data.progress} />

            {data.status === "COMPLETED" && (
              <div className="flex flex-wrap gap-3">
                {data.githubRepoUrl && (
                  <Button asChild>
                    <a href={data.githubRepoUrl} target="_blank" rel="noreferrer">
                      Ver repositorio en GitHub
                    </a>
                  </Button>
                )}
                {data.zipPath && (
                  <Button variant="outline" asChild>
                    <a href={`/api/exports/${id}/download`}>Descargar ZIP</a>
                  </Button>
                )}
              </div>
            )}

            {data.status === "FAILED" && (
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{data.errorMessage}</p>
                <form onSubmit={onRetry} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Si el sitio bloquea el rastreo automático, pega aquí el HTML completo de la
                    página (clic derecho → &quot;Ver código fuente&quot;) para reintentar con eso.
                  </p>
                  <Textarea
                    value={rawHtml}
                    onChange={(e) => setRawHtml(e.target.value)}
                    placeholder="<html>...</html>"
                    rows={6}
                  />
                  <Button type="submit" size="sm" disabled={retrying || rawHtml.trim().length < 100}>
                    {retrying ? "Reintentando..." : "Reintentar con este HTML"}
                  </Button>
                  {retryError && <p className="text-xs text-destructive">{retryError}</p>}
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Registro en vivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-1 overflow-y-auto rounded-md bg-muted/30 p-3 font-mono text-xs">
              {data.logs.length === 0 && <p className="text-muted-foreground">Esperando logs...</p>}
              {data.logs.map((log) => (
                <p
                  key={log.id}
                  className={log.level === "ERROR" ? "text-destructive" : "text-foreground/80"}
                >
                  {log.message}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

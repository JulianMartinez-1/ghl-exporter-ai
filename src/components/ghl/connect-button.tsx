"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plug } from "lucide-react";

const USE_PIT = process.env.NEXT_PUBLIC_GHL_USE_PIT === "true";

export function ConnectGhlButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectPit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ghl/private-connect", { method: "POST" });
      const data = (await res.json()) as { success?: boolean; error?: string; locationName?: string };
      if (!data.success) {
        setError(data.error ?? "Error al conectar");
        return;
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectOAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ghl/oauth?popup=1");
      const data = (await res.json()) as { url?: string; error?: string };
      if (!data.url) {
        setError(data.error ?? "No se obtuvo URL de OAuth");
        setLoading(false);
        return;
      }

      const w = 650, h = 720;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(
        data.url,
        "ghl-oauth",
        `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,status=yes`
      );

      if (!popup) {
        window.location.href = data.url;
        return;
      }

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "GHL_OAUTH_SUCCESS") {
          cleanup();
          window.location.reload();
        } else if (event.data?.type === "GHL_OAUTH_ERROR") {
          cleanup();
          setLoading(false);
        }
      };

      const closedCheck = setInterval(() => {
        if (popup.closed) cleanup();
      }, 600);

      const cleanup = () => {
        clearInterval(closedCheck);
        window.removeEventListener("message", onMessage);
        setLoading(false);
      };

      window.addEventListener("message", onMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={USE_PIT ? handleConnectPit : handleConnectOAuth}
        disabled={loading}
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
        {loading ? "Conectando…" : "Conectar GoHighLevel"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

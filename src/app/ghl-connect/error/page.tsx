"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { Suspense } from "react";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "unknown_error";

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "GHL_OAUTH_ERROR", error }, window.location.origin);
      setTimeout(() => window.close(), 2500);
    } else {
      window.location.replace(`/dashboard?ghl_error=${encodeURIComponent(error)}`);
    }
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <XCircle className="h-14 w-14 text-destructive" />
      <p className="text-xl font-semibold">Error de conexión</p>
      <p className="max-w-sm text-center text-sm text-muted-foreground">{error}</p>
      <p className="text-xs text-muted-foreground">Esta ventana se cerrará automáticamente…</p>
    </div>
  );
}

export default function GhlConnectErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}

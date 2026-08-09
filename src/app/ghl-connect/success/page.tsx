"use client";

import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

export default function GhlConnectSuccessPage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "GHL_OAUTH_SUCCESS" }, window.location.origin);
      setTimeout(() => window.close(), 800);
    } else {
      window.location.replace("/dashboard?ghl_connected=true");
    }
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
      <CheckCircle className="h-14 w-14 text-emerald-500" />
      <p className="text-xl font-semibold">¡GoHighLevel conectado!</p>
      <p className="text-sm text-muted-foreground">Esta ventana se cerrará automáticamente…</p>
    </div>
  );
}

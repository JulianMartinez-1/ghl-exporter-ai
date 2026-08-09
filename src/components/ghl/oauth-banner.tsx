"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, X } from "lucide-react";

export function GhlOAuthBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<"success" | "error">("success");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const connected = params.get("ghl_connected");
    const error = params.get("ghl_error");

    if (connected === "true") {
      setType("success");
      setMessage("¡GoHighLevel conectado correctamente!");
      setVisible(true);
    } else if (error) {
      setType("error");
      setMessage(`Error al conectar GoHighLevel: ${error}`);
      setVisible(true);
    }
  }, [params]);

  const dismiss = () => {
    setVisible(false);
    // Remove query params without reloading
    router.replace("/dashboard", { scroll: false });
  };

  if (!visible) return null;

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
      }`}
    >
      <div className="flex items-center gap-3">
        {type === "success" ? (
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
        )}
        <p
          className={`text-sm font-medium ${
            type === "success" ? "text-emerald-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"
          }`}
        >
          {message}
        </p>
      </div>
      <button onClick={dismiss} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";

interface Props {
  redirectUri: string;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
}

export function GhlSetupGuide({ redirectUri, clientIdConfigured, clientSecretConfigured }: Props) {
  const [copied, setCopied] = useState(false);

  const copyUri = async () => {
    await navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allGood = clientIdConfigured && clientSecretConfigured;

  return (
    <Card className={allGood ? "border-emerald-200 dark:border-emerald-800" : "border-amber-200 dark:border-amber-800"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {allGood ? (
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            Configuración GoHighLevel OAuth
          </CardTitle>
          <Badge variant={allGood ? "success" : "warning"}>
            {allGood ? "Configurado" : "Pendiente"}
          </Badge>
        </div>
        <CardDescription>
          Para que la conexión con GoHighLevel funcione, debes configurar tu app en el Marketplace de GHL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Status checks */}
        <div className="space-y-2">
          <StatusRow label="GHL_CLIENT_ID configurado" ok={clientIdConfigured} />
          <StatusRow label="GHL_CLIENT_SECRET configurado" ok={clientSecretConfigured} />
        </div>

        {/* Redirect URI — most important */}
        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
          <p className="text-sm font-semibold">
            ⚠️ Redirect URI — debes configurar este valor exacto en tu app de GHL
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background border px-3 py-2 text-xs font-mono break-all">
              {redirectUri}
            </code>
            <button
              onClick={copyUri}
              className="shrink-0 rounded-md border p-2 hover:bg-accent transition-colors"
              title="Copiar"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si este valor no coincide con el registrado en GHL, el login redirigirá al Marketplace de GHL en lugar de volver aquí.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Pasos para configurar tu app en GHL Marketplace:</p>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              Ve a{" "}
              <a
                href="https://marketplace.gohighlevel.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                marketplace.gohighlevel.com/apps
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              y abre (o crea) tu app.
            </li>
            <li>
              En la sección <strong>Auth</strong>, pega el Redirect URI que ves arriba en el campo{" "}
              <strong>&quot;Redirect URL&quot;</strong>.
            </li>
            <li>
              Copia el <strong>Client ID</strong> y el <strong>Client Secret</strong> de tu app y ponlos en{" "}
              <code className="text-xs bg-muted px-1 rounded">GHL_CLIENT_ID</code> y{" "}
              <code className="text-xs bg-muted px-1 rounded">GHL_CLIENT_SECRET</code> en tu{" "}
              <code className="text-xs bg-muted px-1 rounded">.env.local</code>.
            </li>
            <li>
              Guarda cambios en GHL y reinicia el servidor con{" "}
              <code className="text-xs bg-muted px-1 rounded">npm run dev</code>.
            </li>
            <li>Vuelve aquí y haz clic en <strong>&quot;Conectar GoHighLevel&quot;</strong>.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
      <span className={ok ? "text-foreground" : "text-amber-700 dark:text-amber-400"}>{label}</span>
    </div>
  );
}

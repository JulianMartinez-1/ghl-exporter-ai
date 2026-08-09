import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectGhlButton } from "@/components/ghl/connect-button";
import { Badge } from "@/components/ui/badge";
import { GhlSetupGuide } from "@/components/ghl/setup-guide";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { ghlConnections: true },
  });
  if (!user) redirect("/sign-in");

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/connect/callback`;
  const clientIdConfigured = !!(process.env.GHL_CLIENT_ID && process.env.GHL_CLIENT_ID !== "TU_GHL_CLIENT_ID");
  const clientSecretConfigured = !!(process.env.GHL_CLIENT_SECRET && process.env.GHL_CLIENT_SECRET !== "TU_GHL_CLIENT_SECRET");

  const envVars = [
    { key: "GITHUB_TOKEN", description: "Personal Access Token con permisos repo" },
    { key: "GITHUB_ORG", description: "Username o Org donde crear repositorios" },
    { key: "VERCEL_TOKEN", description: "Token de API de Vercel" },
    { key: "DATABASE_URL", description: "URL de PostgreSQL" },
    { key: "REDIS_URL", description: "URL de Redis" },
    { key: "NEXT_PUBLIC_SUPABASE_URL", description: "URL de tu proyecto Supabase" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Gestiona tu cuenta y conexiones.</p>
      </div>

      <GhlSetupGuide
        redirectUri={redirectUri}
        clientIdConfigured={clientIdConfigured}
        clientSecretConfigured={clientSecretConfigured}
      />

      {/* Active connections */}
      <Card className="border-border card-shadow bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Conexiones GoHighLevel</CardTitle>
          <CardDescription className="text-xs">
            Subcuentas conectadas via OAuth 2.0. Cada conexión representa una Location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.ghlConnections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay conexiones activas. Conecta tu cuenta usando el botón de abajo.
            </p>
          )}
          {user.ghlConnections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold">{conn.locationName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: <span className="font-mono">{conn.locationId}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Expira: {new Date(conn.expiresAt).toLocaleDateString("es")}
                </p>
              </div>
              <Badge variant={new Date() < conn.expiresAt ? "success" : "warning"}>
                {new Date() < conn.expiresAt ? "Activa" : "Expirada"}
              </Badge>
            </div>
          ))}
          <div className="pt-1">
            <ConnectGhlButton />
          </div>
        </CardContent>
      </Card>

      {/* Env vars */}
      <Card className="border-border card-shadow bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Variables de entorno</CardTitle>
          <CardDescription className="text-xs">
            Servicios externos configurados en{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {envVars.map(({ key, description }) => (
              <div
                key={key}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0"
              >
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded text-foreground shrink-0">
                  {key}
                </code>
                <span className="text-xs text-muted-foreground flex-1">{description}</span>
                <div className="shrink-0">
                  {process.env[key] ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ConnectGhlButton } from "@/components/ghl/connect-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Rocket, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react";
import { Suspense } from "react";
import { GhlOAuthBanner } from "@/components/ghl/oauth-banner";

export default async function DashboardPage() {
  const { userId: clerkId, sessionClaims } = await auth();
  if (!clerkId) redirect("/sign-in");

  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      ghlConnections: true,
      exports: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) {
    const claims = sessionClaims as Record<string, unknown>;
    let primaryEmail = (claims?.primaryEmail as string | undefined) ?? "";
    let name: string | null = (claims?.fullName as string | undefined) ?? null;
    let avatarUrl: string | null = null;

    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(clerkId);
      primaryEmail =
        clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
          ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? primaryEmail;
      name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || name;
      avatarUrl = clerkUser.imageUrl ?? null;
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      console.error("[Dashboard] Clerk backend inalcanzable:", JSON.stringify(e?.errors));
      if (!primaryEmail) redirect("/sign-in");
    }

    user = await prisma.user.create({
      data: { clerkId, email: primaryEmail, name, avatarUrl },
      include: {
        ghlConnections: true,
        exports: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  }

  const stats = await prisma.$transaction([
    prisma.export.count({ where: { userId: user.id } }),
    prisma.export.count({ where: { userId: user.id, status: "COMPLETED" } }),
    prisma.export.count({ where: { userId: user.id, status: "FAILED" } }),
    prisma.export.count({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "EXTRACTING", "CONVERTING", "PUSHING_TO_GITHUB", "DEPLOYING"] },
      },
    }),
  ]);

  const [total, completed, failed, active] = stats;
  const hasConnections = user.ghlConnections.length > 0;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Bienvenido de vuelta,{" "}
            <span className="font-medium text-foreground">{user.name ?? user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">GHL Exporter AI</span>
        </div>
      </div>

      <Suspense>
        <GhlOAuthBanner />
      </Suspense>

      {/* GHL Connection alert */}
      {!hasConnections && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Cuenta GoHighLevel no conectada
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Conecta tu cuenta para empezar a exportar Funnels y Websites.
              </p>
            </div>
          </div>
          <ConnectGhlButton />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          title="Total"
          value={total}
          icon={Download}
          iconBgClassName="bg-slate-100"
          iconClassName="text-slate-600"
        />
        <StatsCard
          title="Completadas"
          value={completed}
          icon={CheckCircle}
          iconBgClassName="bg-emerald-50"
          iconClassName="text-emerald-600"
        />
        <StatsCard
          title="En progreso"
          value={active}
          icon={Clock}
          iconBgClassName="bg-blue-50"
          iconClassName="text-blue-600"
        />
        <StatsCard
          title="Con errores"
          value={failed}
          icon={Rocket}
          iconBgClassName="bg-red-50"
          iconClassName="text-red-500"
        />
      </div>

      {/* Connected accounts & recent exports */}
      {hasConnections && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Card className="border-border card-shadow bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Cuentas GHL conectadas</CardTitle>
              <CardDescription className="text-xs">
                Subcuentas vinculadas via OAuth 2.0
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.ghlConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium leading-none">{conn.locationName}</p>
                    <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                      {conn.locationId}
                    </p>
                  </div>
                  <Badge
                    variant={new Date() < conn.expiresAt ? "success" : "warning"}
                    className="text-xs"
                  >
                    {new Date() < conn.expiresAt ? "Activa" : "Expirada"}
                  </Badge>
                </div>
              ))}
              <div className="pt-1">
                <ConnectGhlButton />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border card-shadow bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Exportaciones recientes</CardTitle>
              <CardDescription className="text-xs">Últimas 5 exportaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {user.exports.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay exportaciones aún.
                </p>
              ) : (
                user.exports.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {exp.pageName ?? exp.sourceName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(exp.createdAt).toLocaleDateString("es")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        exp.status === "COMPLETED"
                          ? "success"
                          : exp.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="ml-3 shrink-0 text-[10px]"
                    >
                      {exp.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

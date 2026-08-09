import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ExternalLink, CheckCircle } from "lucide-react";

export default async function DeploysPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const deploys = await prisma.export.findMany({
    where: {
      userId: user.id,
      vercelDeployUrl: { not: null },
    },
    orderBy: { completedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Deploys</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Sitios desplegados en Vercel.</p>
      </div>

      {deploys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white p-16 text-center card-shadow">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Globe className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Sin deploys aún</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Los deploys aparecerán aquí cuando completes una exportación.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deploys.map((deploy) => (
            <div
              key={deploy.id}
              className="flex items-center justify-between rounded-xl border border-border bg-white px-5 py-4 card-shadow transition-shadow hover:card-shadow-hover"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {deploy.pageName ?? deploy.sourceName}
                  </p>
                  <a
                    href={deploy.vercelDeployUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block max-w-xs"
                  >
                    {deploy.vercelDeployUrl}
                  </a>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 ml-4">
                <Badge variant="success" className="gap-1 text-xs">
                  <CheckCircle className="h-3 w-3" />
                  Live
                </Badge>
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <a href={deploy.vercelDeployUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

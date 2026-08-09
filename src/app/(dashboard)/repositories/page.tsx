import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { GitBranch, ExternalLink } from "lucide-react";

export default async function RepositoriesPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const repos = await prisma.export.findMany({
    where: {
      userId: user.id,
      githubRepoUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Repositorios</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Repositorios GitHub creados automáticamente.
        </p>
      </div>

      {repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white p-16 text-center card-shadow">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <GitBranch className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Sin repositorios</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            Los repositorios aparecerán aquí al completar una exportación.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="flex items-center justify-between rounded-xl border border-border bg-white px-5 py-4 card-shadow transition-shadow hover:card-shadow-hover"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <GitBranch className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {repo.githubRepoName ?? repo.pageName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(repo.createdAt).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <a href={repo.githubRepoUrl!} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

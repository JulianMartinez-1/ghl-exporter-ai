import type { GeneratedFile, VercelDeployResult } from "@/types";
import { sleep } from "@/lib/utils";

export class VercelService {
  private token: string;
  private teamId?: string;
  private baseUrl = "https://api.vercel.com";

  constructor(token: string, teamId?: string) {
    this.token = token;
    this.teamId = teamId;
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private teamQuery(): string {
    return this.teamId ? `?teamId=${this.teamId}` : "";
  }

  private async getDeploymentEvents(deploymentId: string): Promise<string[]> {
    // Fetch all build events (forward = chronological order so errors appear at the end)
    const sep = this.teamId ? "&" : "?";
    const res = await fetch(
      `${this.baseUrl}/v3/deployments/${deploymentId}/events${this.teamQuery()}${sep}limit=100&direction=forward`,
      { headers: this.headers }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];

    const allLines: string[] = [];
    for (const entry of data) {
      if (!entry || typeof entry !== "object") continue;

      const record = entry as Record<string, unknown>;
      const type = typeof record.type === "string" ? record.type : "event";
      const created = typeof record.created === "number" ? new Date(record.created).toISOString() : "";
      const payload = record.payload as Record<string, unknown> | undefined;
      const textFromPayload = payload && typeof payload.text === "string" ? payload.text : undefined;
      const text =
        typeof record.text === "string"
          ? record.text
          : textFromPayload ??
            (typeof record.message === "string" ? record.message : undefined) ??
            (typeof record.level === "string" ? record.level : undefined);

      if (!text) continue;
      allLines.push(`${created ? `${created} ` : ""}[${type}] ${text}`);
    }

    // Return the last 20 lines — these contain the actual build errors
    return allLines.slice(-20);
  }

  // Deploy files directly to Vercel — no GitHub connection required.
  // Creates or reuses a project, uploads all source files, and triggers a build.
  async deployFiles(
    projectName: string,
    files: GeneratedFile[],
    packageJson: Record<string, unknown>
  ): Promise<string> {
    // Build the complete file list including package.json
    const allFiles: GeneratedFile[] = [
      { path: "package.json", content: JSON.stringify(packageJson, null, 2) },
      ...files,
    ];

    const vercelFiles = allFiles.map((f) => ({
      file: f.path,
      data: f.content,
      encoding: f.encoding === "base64" ? "base64" : "utf-8",
    }));

    const body = {
      name: projectName,
      files: vercelFiles,
      projectSettings: {
        framework: null,       // static deployment — no build step, no framework
        buildCommand: null,
        outputDirectory: null,
        installCommand: null,
      },
      target: "production",
    };

    const res = await fetch(`${this.baseUrl}/v13/deployments${this.teamQuery()}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Vercel deployment creation failed: ${err}`);
    }

    const data = (await res.json()) as { id: string };
    return data.id;
  }

  async waitForDeployment(
    deploymentId: string,
    onProgress?: (state: string) => void,
    timeoutMs = 300_000
  ): Promise<VercelDeployResult> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const res = await fetch(
        `${this.baseUrl}/v13/deployments/${deploymentId}${this.teamQuery()}`,
        { headers: this.headers }
      );

      if (!res.ok) throw new Error(`Failed to check deployment: ${res.status}`);

      const data = (await res.json()) as {
        id: string;
        status?: string;
        readyState?: string;
        url?: string;
        alias?: string[];
        meta?: Record<string, string>;
        projectId?: string;
      };

      const state = data.readyState ?? data.status ?? "QUEUED";
      onProgress?.(state);

      if (state === "READY") {
        const url = data.alias?.[0] ?? data.url ?? "";
        return {
          projectId: data.projectId ?? data.meta?.["projectId"] ?? "",
          deploymentId: data.id,
          url: url.startsWith("https://") ? url : `https://${url}`,
          state: "READY",
        };
      }

      if (state === "ERROR" || state === "CANCELED") {
        const errorMessage = (data as Record<string, unknown>).errorMessage as string | undefined;
        const errorCode = (data as Record<string, unknown>).errorCode as string | undefined;
        const eventLines = await this.getDeploymentEvents(deploymentId);
        const eventSummary = eventLines.length > 0 ? `\nVercel events:\n- ${eventLines.join("\n- ")}` : "";
        throw new Error(
          `Deployment failed (${state})${errorCode ? ` [${errorCode}]` : ""}${errorMessage ? `: ${errorMessage}` : ""}${eventSummary}`
        );
      }

      await sleep(5_000);
    }

    throw new Error("Deployment timed out after 5 minutes.");
  }

  async getProject(projectId: string): Promise<{ id: string; name: string } | null> {
    const res = await fetch(
      `${this.baseUrl}/v9/projects/${projectId}${this.teamQuery()}`,
      { headers: this.headers }
    );
    if (!res.ok) return null;
    return res.json() as Promise<{ id: string; name: string }>;
  }
}

import { Octokit } from "@octokit/rest";
import type { GeneratedFile, GitHubRepoResult } from "@/types";

export class GitHubService {
  private octokit: Octokit;
  private owner: string;

  constructor(token: string, owner: string) {
    this.octokit = new Octokit({
      auth: token,
      request: { timeout: 60_000 }, // 60s — default 10s is too short on slow networks
    });
    this.owner = owner;
  }

  async createRepository(repoName: string, description: string): Promise<GitHubRepoResult> {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: false,
      auto_init: true, // creates an initial commit so the Git Data API is usable immediately
    });

    return {
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      cloneUrl: data.clone_url,
      defaultBranch: data.default_branch ?? "main",
    };
  }

  async pushFiles(
    repoName: string,
    files: GeneratedFile[],
    commitMessage = "Initial commit — exported by GHL Exporter AI",
    onProgress?: (msg: string) => void
  ): Promise<void> {
    onProgress?.("Creando árbol de archivos en GitHub...");

    // Get the current HEAD so we can use it as parent commit (repo always has a commit via auto_init)
    let parentSha: string | undefined;
    try {
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo: repoName,
        ref: "heads/main",
      });
      parentSha = ref.object.sha;
    } catch {
      // No HEAD yet — will create the first ref
    }

    // Create blobs for all files (batch in groups of 20 to avoid rate limits)
    const treeItems: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      sha: string;
    }> = [];

    const BATCH_SIZE = 20;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const blobPromises = batch.map(async (file) => {
        const content =
          file.encoding === "base64"
            ? file.content
            : Buffer.from(file.content).toString("base64");

        const { data: blob } = await this.octokit.git.createBlob({
          owner: this.owner,
          repo: repoName,
          content,
          encoding: "base64",
        });

        return { path: file.path, sha: blob.sha };
      });

      const blobs = await Promise.all(blobPromises);
      for (const { path, sha } of blobs) {
        treeItems.push({ path, mode: "100644", type: "blob", sha });
      }

      onProgress?.(`Subiendo archivos: ${Math.min(i + BATCH_SIZE, files.length)}/${files.length}`);
    }

    // Create a fresh tree with only our files (no base_tree — avoids inheriting the auto_init README)
    const { data: tree } = await this.octokit.git.createTree({
      owner: this.owner,
      repo: repoName,
      tree: treeItems,
    });

    // Create commit
    const { data: newCommit } = await this.octokit.git.createCommit({
      owner: this.owner,
      repo: repoName,
      message: commitMessage,
      tree: tree.sha,
      parents: parentSha ? [parentSha] : [],
    });

    // Update or create the main branch ref
    if (parentSha) {
      await this.octokit.git.updateRef({
        owner: this.owner,
        repo: repoName,
        ref: "heads/main",
        sha: newCommit.sha,
      });
    } else {
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: repoName,
        ref: "refs/heads/main",
        sha: newCommit.sha,
      });
    }

    onProgress?.("Push a GitHub completado.");
  }

  async ensureRepoName(desiredName: string): Promise<string> {
    const name = desiredName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    let attempt = 0;

    while (attempt < 10) {
      const candidate = attempt === 0 ? name : `${name}-${attempt}`;
      try {
        await this.octokit.repos.get({ owner: this.owner, repo: candidate });
        attempt++;
      } catch {
        return candidate;
      }
    }
    return `${name}-${Date.now()}`;
  }
}

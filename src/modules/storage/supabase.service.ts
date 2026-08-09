import { createClient } from "@supabase/supabase-js";
import type { GeneratedProject } from "@/types";

const BUCKET = "exports";

export class SupabaseStorageService {
  private supabase;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    this.supabase = createClient(url, key);
  }

  async uploadProject(exportId: string, project: GeneratedProject): Promise<string> {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    // Add package.json
    zip.file("package.json", JSON.stringify(project.packageJson, null, 2));

    // Add all generated files
    for (const file of project.files) {
      if (file.encoding === "base64") {
        zip.file(file.path, file.content, { base64: true });
      } else {
        zip.file(file.path, file.content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const path = `${exportId}/${project.name}.zip`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(path, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
    return data.signedUrl;
  }

  async ensureBucketExists(): Promise<void> {
    const { data: buckets } = await this.supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);

    if (!exists) {
      await this.supabase.storage.createBucket(BUCKET, { public: true });
    }
  }
}

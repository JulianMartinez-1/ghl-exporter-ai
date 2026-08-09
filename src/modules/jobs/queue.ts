import { Queue } from "bullmq";
import { createRedisConnection } from "@/lib/redis";
import type { ExportJobData } from "@/types";

export const EXPORT_QUEUE = "exports";

export const exportQueue = new Queue<ExportJobData>(EXPORT_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

export async function enqueueExport(data: ExportJobData): Promise<string> {
  const job = await exportQueue.add("export", data, {
    jobId: data.exportId,
  });
  return job.id ?? data.exportId;
}

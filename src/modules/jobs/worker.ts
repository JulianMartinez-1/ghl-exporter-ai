import { Worker } from "bullmq";
import { createRedisConnection } from "@/lib/redis";
import { processExport } from "./processors/export.processor";
import { EXPORT_QUEUE } from "./queue";

const worker = new Worker(EXPORT_QUEUE, processExport, {
  connection: createRedisConnection(),
  concurrency: 3,
});

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

console.log("[Worker] Export worker started. Waiting for jobs...");

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});

export { worker };

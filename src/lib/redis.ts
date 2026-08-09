import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const globalForRedis = globalThis as unknown as { redis: IORedis | undefined };

function createClient() {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Suppress unhandled error events during build/test
redis.on("error", () => {});

export function createRedisConnection() {
  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  });
  client.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ECONNREFUSED") {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Redis] Sin conexión — asegúrate de que Redis esté corriendo.");
      }
    } else {
      console.error("[Redis]", err.message);
    }
  });
  return client;
}

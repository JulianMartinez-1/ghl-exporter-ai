import { prisma } from "@/lib/prisma";
import type { LogLevel } from "@prisma/client";

/** Writes append-only log rows for one export — polled by the UI for live progress. */
export class ExportLogger {
  constructor(private exportId: string) {}

  private async write(level: LogLevel, message: string): Promise<void> {
    try {
      await prisma.exportLog.create({
        data: { exportId: this.exportId, level, message },
      });
    } catch (err) {
      // Logging must never break the export itself.
      console.error("[ExportLogger] failed to write log:", err);
    }
  }

  debug(message: string) {
    return this.write("DEBUG", message);
  }
  info(message: string) {
    return this.write("INFO", message);
  }
  warn(message: string) {
    return this.write("WARN", message);
  }
  error(message: string) {
    return this.write("ERROR", message);
  }
}

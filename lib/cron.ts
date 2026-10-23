import { schedule } from "node-cron";
import { remindAll } from "@/lib/remind";

const globalForCron = globalThis as unknown as { qiyiCron?: boolean };

export function startScheduler() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (globalForCron.qiyiCron) return;
  if (process.env.ENABLE_CRON === "0") return;
  const enabled = process.env.NODE_ENV === "production" || process.env.ENABLE_CRON === "1";
  if (!enabled) return;
  globalForCron.qiyiCron = true;
  const task = schedule(
    "30 7 * * *",
    () => {
      void remindAll();
    },
    { timezone: "Asia/Shanghai", name: "qiyi-daily-outfit", noOverlap: true },
  );
  void task.start();
  console.log("daily outfit reminder scheduled for 07:30 Asia/Shanghai");
}

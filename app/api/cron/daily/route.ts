import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok } from "@/lib/http";
import { remindAll } from "@/lib/remind";

export async function POST(request: Request) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    const header = request.headers.get("x-cron-secret");
    if (!secret || header !== secret) throw new ApiError(403, "定时任务密钥不正确");
    const sent = await remindAll();
    return ok({ sent });
  });
}

export async function GET() {
  return handle(async () => {
    await requireApiUser();
    return ok({ ok: true });
  });
}

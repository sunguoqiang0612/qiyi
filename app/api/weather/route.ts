import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { weatherFor } from "@/lib/remind";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    return ok(await weatherFor(user));
  });
}

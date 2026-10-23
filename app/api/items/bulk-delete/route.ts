import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { removeUpload } from "@/lib/uploads";
import { readJson } from "@/lib/http";
import { ApiError } from "@/lib/http";

export async function POST(request: Request) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const body = await readJson(request);
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
    if (ids.length === 0) throw new ApiError(400, "没有选择衣服");
    const items = await prisma.item.findMany({
      where: { id: { in: ids }, userId: user.id },
      select: { id: true, imagePath: true },
    });
    await prisma.item.deleteMany({ where: { id: { in: items.map((item) => item.id) } } });
    await Promise.all(items.map((item) => removeUpload(item.imagePath)));
    return ok({ deleted: items.length });
  });
}

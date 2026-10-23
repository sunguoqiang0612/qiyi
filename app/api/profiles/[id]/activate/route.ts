import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const profile = await prisma.profile.findFirst({ where: { id, userId: user.id } });
    if (!profile) throw new ApiError(404, "找不到这位成员");
    await prisma.user.update({ where: { id: user.id }, data: { activeProfileId: id } });
    return ok({ ok: true });
  });
}

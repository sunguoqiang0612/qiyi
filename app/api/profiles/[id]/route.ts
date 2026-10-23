import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { isRelation } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const profile = await prisma.profile.findFirst({ where: { id, userId: user.id } });
    if (!profile) throw new ApiError(404, "找不到这位成员");
    const body = await readJson(request);
    const name = typeof body.name === "string" ? body.name.trim() : profile.name;
    const relation = typeof body.relation === "string" ? body.relation : profile.relation;
    if (name.length < 1 || name.length > 40) throw new ApiError(400, "请填写成员名字");
    if (!isRelation(relation)) throw new ApiError(400, "关系不正确");
    const updated = await prisma.profile.update({ where: { id }, data: { name, relation } });
    return ok({ profile: updated });
  });
}

export async function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const profiles = await prisma.profile.findMany({ where: { userId: user.id } });
    if (profiles.length <= 1) throw new ApiError(400, "至少保留一位成员");
    const profile = profiles.find((item) => item.id === id);
    if (!profile) throw new ApiError(404, "找不到这位成员");
    await prisma.profile.delete({ where: { id } });
    if (user.activeProfileId === id) {
      const next = profiles.find((item) => item.id !== id);
      if (next) await prisma.user.update({ where: { id: user.id }, data: { activeProfileId: next.id } });
    }
    return ok({ ok: true });
  });
}

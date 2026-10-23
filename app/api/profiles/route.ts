import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { isRelation } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toProfileDTO } from "@/lib/dto";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const profiles = await prisma.profile.findMany({
      where: { userId: user.id },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "asc" },
    });
    return ok({ profiles: profiles.map((profile) => toProfileDTO(profile, user.activeProfileId)) });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const body = await readJson(request);
    const name = String(body.name ?? "").trim();
    const relation = String(body.relation ?? "other");
    if (name.length < 1 || name.length > 40) throw new ApiError(400, "请填写成员名字");
    if (!isRelation(relation)) throw new ApiError(400, "关系不正确");
    const profile = await prisma.profile.create({
      data: { userId: user.id, name, relation },
      include: { _count: { select: { items: true } } },
    });
    return ok({ profile: toProfileDTO(profile, user.activeProfileId) }, 201);
  });
}

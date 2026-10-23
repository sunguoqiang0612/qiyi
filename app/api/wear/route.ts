import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { localISODate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { logWear } from "@/lib/wear";

export async function POST(request: Request) {
  return handle(async () => {
    const { user, profile } = await requireApiUser();
    const body = await readJson(request);
    const wornOn = typeof body.wornOn === "string" ? body.wornOn : localISODate();
    const note = typeof body.note === "string" ? body.note : "";
    if (typeof body.outfitId === "string" && body.outfitId) {
      const outfit = await prisma.outfit.findFirst({
        where: { id: body.outfitId, userId: user.id, profileId: profile.id },
        include: { items: true },
      });
      if (!outfit) throw new ApiError(404, "找不到这套衣服");
      const groupId = await logWear({
        userId: user.id,
        profileId: profile.id,
        itemIds: outfit.items.map((item) => item.itemId),
        outfitId: outfit.id,
        wornOn,
        note,
        threshold: user.washThreshold,
      });
      return ok({ groupId });
    }
    if (typeof body.itemId === "string" && body.itemId) {
      const groupId = await logWear({
        userId: user.id,
        profileId: profile.id,
        itemIds: [body.itemId],
        wornOn,
        note,
        threshold: user.washThreshold,
      });
      return ok({ groupId });
    }
    throw new ApiError(400, "请选择衣服或套装");
  });
}

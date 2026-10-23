import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { asStringArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { createOutfit } from "@/lib/wardrobe-actions";
import { toOutfitDTO } from "@/lib/dto";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return handle(async () => {
    const { user, profile } = await requireApiUser();
    const { id } = await context.params;
    const body = await readJson(request);
    const verdict = body.verdict === "loved" || body.verdict === "disliked" || body.verdict === "skipped" ? body.verdict : "";
    if (!verdict) throw new ApiError(400, "反馈不正确");
    const log = await prisma.suggestionLog.findFirst({ where: { id, userId: user.id } });
    if (!log) throw new ApiError(404, "找不到这套建议");
    let outfit = null;
    if (verdict === "loved" && !log.outfitId) {
      const itemIds = asStringArray(log.itemIds);
      if (itemIds.length >= 2) {
        outfit = await createOutfit({
          userId: user.id,
          profileId: profile.id,
          name: log.name,
          occasion: log.occasion,
          notes: null,
          tip: log.tip,
          itemIds,
        });
      } else if (itemIds.length === 1) {
        const created = await prisma.outfit.create({
          data: {
            userId: user.id,
            profileId: profile.id,
            name: log.name,
            occasion: log.occasion,
            tip: log.tip,
            items: { create: [{ itemId: itemIds[0], slot: "piece" }] },
          },
          include: { items: { include: { item: true } } },
        });
        outfit = toOutfitDTO(created);
      }
    }
    const updated = await prisma.suggestionLog.update({
      where: { id: log.id },
      data: { verdict, outfitId: outfit?.id ?? log.outfitId },
    });
    return ok({ verdict: updated.verdict, outfit });
  });
}

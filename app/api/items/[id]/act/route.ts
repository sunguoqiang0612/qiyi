import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { localISODate } from "@/lib/dates";
import { logWear, setWash, undoLastWear } from "@/lib/wear";
import { prisma } from "@/lib/prisma";
import { toItemDTO } from "@/lib/dto";
import { resolveAi, tagImage } from "@/lib/ai";

type Context = { params: Promise<{ id: string }> };

async function ownItem(userId: string, id: string) {
  const item = await prisma.item.findFirst({ where: { id, userId } });
  if (!item) throw new ApiError(404, "找不到这件衣服");
  return item;
}

export async function POST(request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const action = new URL(request.url).searchParams.get("action");
    if (action === "wear") {
      const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);
      const item = await ownItem(user.id, id);
      const wornOn = typeof body.wornOn === "string" ? body.wornOn : localISODate();
      await logWear({
        userId: user.id,
        profileId: item.profileId,
        itemIds: [item.id],
        wornOn,
        note: typeof body.note === "string" ? body.note : "",
        threshold: user.washThreshold,
      });
      const fresh = await ownItem(user.id, id);
      return ok({ item: toItemDTO(fresh) });
    }
    if (action === "undo") {
      await ownItem(user.id, id);
      await undoLastWear(user.id, id, user.washThreshold);
      const fresh = await ownItem(user.id, id);
      return ok({ item: toItemDTO(fresh) });
    }
    if (action === "wash") {
      const body = await readJson(request);
      const wash = body.action === "needs_wash" || body.action === "washing" ? body.action : "washed";
      const item = await setWash(user.id, id, wash);
      return ok({ item: toItemDTO(item) });
    }
    if (action === "favorite") {
      const item = await ownItem(user.id, id);
      const updated = await prisma.item.update({
        where: { id: item.id },
        data: { favorite: !item.favorite },
      });
      return ok({ item: toItemDTO(updated) });
    }
    if (action === "analyze") {
      const item = await ownItem(user.id, id);
      if (!item.imagePath) throw new ApiError(400, "这件衣服还没有照片");
      const config = resolveAi(user);
      if (!config.visionEnabled) throw new ApiError(400, "还没有配置视觉模型");
      const result = await tagImage(config, item.imagePath, user.locale);
      if (!result?.tags) throw new ApiError(502, "模型没有识别出衣服");
      const tags = result.tags;
      const updated = await prisma.item.update({
        where: { id: item.id },
        data: {
          name: item.name === "未命名单品" ? tags.name : item.name,
          category: tags.category,
          colors: tags.colors,
          seasons: tags.seasons,
          tags: tags.tags,
          aiSummary: tags.summary,
          aiConfidence: tags.confidence,
          aiRaw: result.raw as object,
          searchText: [tags.name, item.notes ?? "", tags.category, ...tags.colors, ...tags.seasons, ...tags.tags]
            .join(" ")
            .toLowerCase()
            .slice(0, 500),
        },
      });
      return ok({ item: toItemDTO(updated), tagged: true });
    }
    throw new ApiError(404, "未知操作");
  });
}

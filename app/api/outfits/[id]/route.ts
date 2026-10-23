import { requireApiUser } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { toOutfitDTO } from "@/lib/dto";
import { isOccasion } from "@/lib/constants";
import { logWear } from "@/lib/wear";
import { localISODate } from "@/lib/dates";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const { user, profile } = await requireApiUser();
    const { id } = await context.params;
    const existing = await prisma.outfit.findFirst({
      where: { id, userId: user.id },
      include: { items: true },
    });
    if (!existing) throw new ApiError(404, "找不到这套衣服");
    const body = await readJson(request);
    const itemIds = [...new Set(
      (Array.isArray(body.itemIds) ? body.itemIds : existing.items.map((item) => item.itemId)).filter(
        (itemId): itemId is string => typeof itemId === "string",
      ),
    )];
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds }, userId: user.id, profileId: profile.id },
    });
    if (items.length < 2) throw new ApiError(400, "至少选择两件当前成员的衣服");
    const name = (typeof body.name === "string" ? body.name : existing.name).trim().slice(0, 120) || existing.name;
    const occasionValue = typeof body.occasion === "string" ? body.occasion : existing.occasion;
    const occasion = occasionValue && isOccasion(occasionValue) ? occasionValue : null;
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : existing.notes;
    const outfit = await prisma.outfit.update({
      where: { id },
      data: {
        name,
        occasion,
        notes,
        items: {
          deleteMany: {},
          create: items.map((item) => ({ itemId: item.id, slot: item.category })),
        },
      },
      include: { items: { include: { item: true } } },
    });
    return ok({ outfit: toOutfitDTO(outfit) });
  });
}

export async function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const existing = await prisma.outfit.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError(404, "找不到这套衣服");
    await prisma.outfit.delete({ where: { id } });
    return ok({ ok: true });
  });
}

export async function POST(request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const outfit = await prisma.outfit.findFirst({
      where: { id, userId: user.id },
      include: { items: true },
    });
    if (!outfit) throw new ApiError(404, "找不到这套衣服");
    const body = await readJson(request).catch(() => ({}) as Record<string, unknown>);
    const wornOn = typeof body.wornOn === "string" ? body.wornOn : localISODate();
    await logWear({
      userId: user.id,
      profileId: outfit.profileId,
      itemIds: outfit.items.map((item) => item.itemId),
      outfitId: outfit.id,
      wornOn,
      note: typeof body.note === "string" ? body.note : "",
      threshold: user.washThreshold,
    });
    const fresh = await prisma.outfit.findFirst({
      where: { id },
      include: { items: { include: { item: true } } },
    });
    return ok({ outfit: fresh ? toOutfitDTO(fresh) : null, occasion: outfit.occasion && isOccasion(outfit.occasion) ? outfit.occasion : null });
  });
}

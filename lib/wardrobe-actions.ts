import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toOutfitDTO } from "@/lib/dto";
import { isOccasion } from "@/lib/constants";
import { formatDateOnly } from "@/lib/dates";
import { mediaUrl } from "@/lib/json";
import type { WearGroupDTO } from "@/lib/types";

export async function listOutfits(userId: string, profileId: string) {
  const rows = await prisma.outfit.findMany({
    where: { userId, profileId },
    include: { items: { include: { item: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOutfitDTO);
}

export async function createOutfit(input: {
  userId: string;
  profileId: string;
  name: string;
  occasion?: string | null;
  notes?: string | null;
  tip?: string | null;
  itemIds: string[];
}) {
  const ids = [...new Set(input.itemIds)];
  const items = await prisma.item.findMany({
    where: { id: { in: ids }, userId: input.userId, profileId: input.profileId },
  });
  if (items.length < 2) throw new ApiError(400, "至少选择两件当前成员的衣服");
  const name = input.name.trim().slice(0, 120) || "未命名套装";
  const occasion = input.occasion && isOccasion(input.occasion) ? input.occasion : null;
  const outfit = await prisma.outfit.create({
    data: {
      userId: input.userId,
      profileId: input.profileId,
      name,
      occasion,
      notes: input.notes?.trim().slice(0, 2000) || null,
      tip: input.tip?.trim().slice(0, 500) || null,
      items: {
        create: items.map((item) => ({ itemId: item.id, slot: item.category })),
      },
    },
    include: { items: { include: { item: true } } },
  });
  return toOutfitDTO(outfit);
}

export async function getHistory(userId: string, profileId: string, month: string) {
  const safeMonth = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [year, mon] = safeMonth.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  const [logs, items, outfits] = await Promise.all([
    prisma.wearLog.findMany({
      where: { userId, profileId, wornOn: { gte: start, lt: end } },
      include: { item: true, outfit: true },
      orderBy: [{ wornOn: "desc" }, { createdAt: "desc" }],
    }),
    prisma.item.findMany({
      where: { userId, profileId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, imagePath: true },
    }),
    prisma.outfit.findMany({
      where: { userId, profileId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const groups = new Map<string, WearGroupDTO>();
  for (const log of logs) {
    const wornOn = formatDateOnly(log.wornOn) ?? safeMonth + "-01";
    const current = groups.get(log.groupId) ?? {
      groupId: log.groupId,
      wornOn,
      note: log.note ?? "",
      outfitName: log.outfit?.name ?? null,
      items: [],
    };
    current.items.push({
      id: log.itemId,
      name: log.item?.name ?? "",
      category: log.item?.category ?? "other",
      imageUrl: mediaUrl(log.item?.imagePath ?? null),
    });
    if (!current.note && log.note) current.note = log.note;
    if (!current.outfitName && log.outfit?.name) current.outfitName = log.outfit.name;
    groups.set(log.groupId, current);
  }
  const days: Record<string, number> = {};
  for (const group of groups.values()) {
    days[group.wornOn] = (days[group.wornOn] ?? 0) + 1;
  }
  return {
    month: safeMonth,
    groups: [...groups.values()],
    days,
    choices: {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        imageUrl: mediaUrl(item.imagePath),
      })),
      outfits: outfits,
    },
  };
}

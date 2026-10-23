import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";
import { toDateOnly } from "@/lib/dates";

type Tx = Prisma.TransactionClient;

async function touchItem(tx: Tx, itemId: string, wornOn: Date, threshold: number, direction: 1 | -1) {
  const item = await tx.item.findUnique({ where: { id: itemId } });
  if (!item) return;
  if (direction === 1) {
    const wearsSinceWash = item.wearsSinceWash + 1;
    let washStatus = item.washStatus;
    if (washStatus !== "washing" && wearsSinceWash >= threshold) washStatus = "needs_wash";
    const lastWornAt = !item.lastWornAt || wornOn >= item.lastWornAt ? wornOn : item.lastWornAt;
    await tx.item.update({
      where: { id: itemId },
      data: {
        wearCount: { increment: 1 },
        wearsSinceWash,
        washStatus,
        lastWornAt,
      },
    });
    return;
  }
  const wearsSinceWash = Math.max(0, item.wearsSinceWash - 1);
  const previous = await tx.wearLog.findFirst({
    where: { itemId },
    orderBy: { wornOn: "desc" },
  });
  let washStatus = item.washStatus;
  if (washStatus === "needs_wash" && wearsSinceWash < threshold) washStatus = "clean";
  await tx.item.update({
    where: { id: itemId },
    data: {
      wearCount: Math.max(0, item.wearCount - 1),
      wearsSinceWash,
      washStatus,
      lastWornAt: previous?.wornOn ?? null,
    },
  });
}

export async function logWear(input: {
  userId: string;
  profileId: string;
  itemIds: string[];
  outfitId?: string | null;
  wornOn: string;
  note?: string;
  threshold: number;
}) {
  const wornOn = toDateOnly(input.wornOn);
  const uniqueIds = [...new Set(input.itemIds)];
  if (uniqueIds.length === 0) throw new ApiError(400, "没有可记录的衣服");
  const items = await prisma.item.findMany({
    where: { id: { in: uniqueIds }, userId: input.userId, profileId: input.profileId },
  });
  if (items.length !== uniqueIds.length) throw new ApiError(404, "有衣服不在当前成员的衣橱里");
  const groupId = randomUUID();
  await prisma.$transaction(async (tx) => {
    for (const itemId of uniqueIds) {
      await tx.wearLog.create({
        data: {
          userId: input.userId,
          profileId: input.profileId,
          itemId,
          outfitId: input.outfitId ?? null,
          groupId,
          wornOn,
          note: input.note?.slice(0, 255) || null,
        },
      });
      await touchItem(tx, itemId, wornOn, input.threshold, 1);
    }
  });
  return groupId;
}

export async function undoLastWear(userId: string, itemId: string, threshold: number) {
  const last = await prisma.wearLog.findFirst({
    where: { userId, itemId },
    orderBy: [{ wornOn: "desc" }, { createdAt: "desc" }],
  });
  if (!last) throw new ApiError(400, "这件衣服还没有穿着记录");
  await prisma.$transaction(async (tx) => {
    await tx.wearLog.delete({ where: { id: last.id } });
    await touchItem(tx, itemId, last.wornOn, threshold, -1);
  });
}

export async function setWash(userId: string, itemId: string, action: "washed" | "needs_wash" | "washing") {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new ApiError(404, "找不到这件衣服");
  if (action === "washed") {
    return prisma.item.update({
      where: { id: itemId },
      data: { washStatus: "clean", wearsSinceWash: 0 },
    });
  }
  return prisma.item.update({
    where: { id: itemId },
    data: { washStatus: action },
  });
}

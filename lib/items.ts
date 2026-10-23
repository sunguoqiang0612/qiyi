import type { SessionUser } from "@/lib/auth";
import { isCategory, PAGE_SIZE, type Category } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toItemDTO } from "@/lib/dto";
import { shanghaiParts } from "@/lib/dates";

export async function listItems(
  user: SessionUser,
  query: { q?: string; category?: string; sort?: string; page?: string },
) {
  const profileId = user.activeProfileId ?? user.profiles[0]?.id;
  const q = (query.q ?? "").trim().toLowerCase();
  const category = query.category && isCategory(query.category) ? query.category : "";
  const page = Math.max(1, Number(query.page) || 1);
  const where = {
    userId: user.id,
    profileId,
    ...(category ? { category } : {}),
    ...(q ? { searchText: { contains: q } } : {}),
  };
  const sort = query.sort ?? "newest";
  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" as const }
      : sort === "most_worn"
        ? { wearCount: "desc" as const }
        : sort === "least_worn"
          ? { wearCount: "asc" as const }
          : sort === "name"
            ? { name: "asc" as const }
            : { createdAt: "desc" as const };

  const [total, rows] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    items: rows.map(toItemDTO),
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    q: query.q ?? "",
    category,
    sort,
    profileId,
  };
}

export async function itemDetail(userId: string, itemId: string, threshold: number) {
  const item = await prisma.item.findFirst({ where: { id: itemId, userId } });
  if (!item) return null;
  const logs = await prisma.wearLog.findMany({
    where: { itemId },
    orderBy: { wornOn: "desc" },
    take: 40,
  });
  const parts = shanghaiParts();
  const cursor = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, 1));
  const months: { key: string; label: string; count: number }[] = [];
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: String(date.getUTCMonth() + 1), count: 0 });
  }
  for (const log of logs) {
    const key = `${log.wornOn.getUTCFullYear()}-${String(log.wornOn.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = months.find((month) => month.key === key);
    if (bucket) bucket.count += 1;
  }
  const ageMonths = Math.max(1, (Date.now() - item.createdAt.getTime()) / (30.44 * 24 * 3600 * 1000));
  return {
    item,
    months,
    avgPerMonth: Math.round((item.wearCount / ageMonths) * 10) / 10,
    recentWears: logs.slice(0, 8).map((log) => ({
      wornOn: log.wornOn,
      note: log.note ?? "",
    })),
    threshold,
  };
}

export function emptyCategoryCounts() {
  return {} as Record<Category, number>;
}

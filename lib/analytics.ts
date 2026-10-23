import type { SessionUser } from "@/lib/auth";
import { colorLabel, type Category, CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { toItemDTO } from "@/lib/dto";
import { asStringArray } from "@/lib/json";
import { shanghaiStartOfToday, shanghaiToday } from "@/lib/dates";
import { t } from "@/lib/i18n";
import type { AnalyticsDTO } from "@/lib/types";

function weekStart(date: Date) {
  const shifted = new Date(date.getTime() + 8 * 3600 * 1000);
  const day = shifted.getUTCDay();
  const mondayOffset = (day + 6) % 7;
  shifted.setUTCDate(shifted.getUTCDate() - mondayOffset);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - 8 * 3600 * 1000);
}

export async function getAnalytics(user: SessionUser): Promise<AnalyticsDTO> {
  const profileId = user.activeProfileId!;
  const locale = user.locale;
  const [items, outfitsSaved, suggestions, wearLogs] = await Promise.all([
    prisma.item.findMany({ where: { userId: user.id, profileId } }),
    prisma.outfit.count({ where: { userId: user.id, profileId } }),
    prisma.suggestionLog.findMany({
      where: { userId: user.id, profileId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.wearLog.findMany({
      where: { userId: user.id, profileId },
      select: { groupId: true, createdAt: true },
    }),
  ]);

  const readyCount = items.filter((item) => item.washStatus === "clean").length;
  const loved = suggestions.filter((entry) => entry.verdict === "loved").length;
  const disliked = suggestions.filter((entry) => entry.verdict === "disliked").length;
  const votes = loved + disliked;
  const groups = new Set(wearLogs.map((log) => log.groupId));
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const wearsThisWeek = new Set(
    wearLogs.filter((log) => log.createdAt >= weekAgo).map((log) => log.groupId),
  ).size;

  const colorMap = new Map<string, number>();
  for (const item of items) {
    const color = asStringArray(item.colors)[0] || "unknown";
    colorMap.set(color, (colorMap.get(color) ?? 0) + 1);
  }
  const colors = [...colorMap.entries()]
    .map(([id, count]) => ({
      id,
      count,
      pct: items.length ? Math.round((count / items.length) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const categories = CATEGORIES.map((id) => ({
    id,
    count: items.filter((item) => item.category === id).length,
  })).filter((entry) => entry.count > 0);

  const worn = items.filter((item) => item.wearCount > 0).sort((a, b) => b.wearCount - a.wearCount);
  const mostWorn = worn.slice(0, 4).map(toItemDTO);
  const leastPool = [...worn].reverse().filter((item) => !mostWorn.some((top) => top.id === item.id));
  const leastWorn = (worn.length <= 4 ? [] : leastPool).slice(0, 4).map(toItemDTO);
  const neverWorn = items
    .filter((item) => item.wearCount === 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 6)
    .map(toItemDTO);

  const insights: string[] = [];
  if (items.length < 4) {
    insights.push(t(locale, "insightFew"));
  } else {
    const never = items.filter((item) => item.wearCount === 0).length;
    if (never > 0) insights.push(t(locale, "insightNever", { n: never }));
    const topColor = colors[0];
    if (topColor && topColor.pct >= 45) {
      const name = topColor.id === "unknown" ? t(locale, "noColor") : colorLabel(locale, topColor.id);
      insights.push(t(locale, "insightColor", { color: name, pct: topColor.pct }));
    } else if (topColor) {
      insights.push(t(locale, "insightBalance"));
    }
    const dirty = items.filter((item) => item.washStatus !== "clean").length;
    if (dirty > 0) insights.push(t(locale, "insightWash", { n: dirty }));
    if (insights.length === 0) insights.push(t(locale, "insightGood"));
  }

  const trend: AnalyticsDTO["trend"] = [];
  const thisWeek = weekStart(new Date());
  for (let index = 7; index >= 0; index -= 1) {
    const start = new Date(thisWeek.getTime() - index * 7 * 86400000);
    const end = new Date(start.getTime() + 7 * 86400000);
    const slice = suggestions.filter((entry) => entry.createdAt >= start && entry.createdAt < end);
    const yes = slice.filter((entry) => entry.verdict === "loved").length;
    const no = slice.filter((entry) => entry.verdict === "disliked").length;
    const shifted = new Date(start.getTime() + 8 * 3600 * 1000);
    trend.push({
      label: t(locale, "weekShort", { m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() }),
      rate: yes + no === 0 ? 0 : Math.round((yes / (yes + no)) * 100),
      total: yes + no,
    });
  }

  return {
    itemCount: items.length,
    readyCount,
    outfitsSaved,
    generated: suggestions.length,
    acceptance: votes === 0 ? null : Math.round((loved / votes) * 100),
    loved,
    disliked,
    totalWears: groups.size,
    wearsThisWeek,
    insights,
    colors,
    categories: categories as { id: Category; count: number }[],
    mostWorn,
    leastWorn,
    neverWorn,
    trend,
  };
}

export async function getDashboard(user: SessionUser) {
  const profileId = user.activeProfileId!;
  const [items, outfitsSaved, generated, logs] = await Promise.all([
    prisma.item.findMany({
      where: { userId: user.id, profileId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.outfit.count({ where: { userId: user.id, profileId } }),
    prisma.suggestionLog.count({ where: { userId: user.id, profileId } }),
    prisma.wearLog.findMany({
      where: { userId: user.id, profileId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { item: true, outfit: true },
    }),
  ]);
  const needsWash = items.filter((item) => item.washStatus !== "clean").slice(0, 4).map(toItemDTO);
  const seen = new Set<string>();
  const recent: { groupId: string; wornOn: string; title: string }[] = [];
  for (const log of logs) {
    if (seen.has(log.groupId)) continue;
    seen.add(log.groupId);
    const siblings = logs.filter((entry) => entry.groupId === log.groupId);
    const title =
      log.outfit?.name ||
      siblings
        .map((entry) => entry.item?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join("、");
    recent.push({
      groupId: log.groupId,
      wornOn: log.wornOn.toISOString().slice(0, 10),
      title: title || "—",
    });
    if (recent.length >= 5) break;
  }
  return {
    itemCount: items.length,
    cleanCount: items.filter((item) => item.washStatus === "clean").length,
    needsWash,
    outfitsSaved,
    generated,
    recent,
    today: shanghaiToday(),
    since: shanghaiStartOfToday().toISOString(),
  };
}

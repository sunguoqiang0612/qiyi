import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { shanghaiToday, toDateOnly } from "../lib/dates";

const prisma = new PrismaClient();

const demoEmail = "demo@qiyi.local";

function daysAgo(days: number) {
  const today = toDateOnly(shanghaiToday());
  return new Date(today.getTime() - days * 86400000);
}

async function main() {
  await prisma.user.deleteMany({ where: { email: demoEmail } });
  const passwordHash = await hash("qiyi-demo-123", 10);
  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      passwordHash,
      name: "林夏",
      city: "上海",
      latitude: 31.2304,
      longitude: 121.4737,
      locale: "zh",
      profiles: { create: { name: "林夏", relation: "self" } },
    },
    include: { profiles: true },
  });
  const profileId = user.profiles[0].id;
  await prisma.user.update({ where: { id: user.id }, data: { activeProfileId: profileId } });

  const specs = [
    ["棕色短袖衬衫", "top", ["brown"], ["summer", "spring"], ["条纹", "casual", "棉"], "干净的短袖，适合塞进裤腰。", 2, 1, "clean", 6],
    ["藏青针织衫", "top", ["navy"], ["autumn", "winter"], ["通勤", "work"], "薄针织，办公室空调里正好。", 4, 0, "clean", 2],
    ["白色棉T恤", "top", ["white"], ["summer", "all"], ["casual", "运动"], "洗了三次还是发白。", 5, 3, "needs_wash", 1],
    ["黑色直筒牛仔裤", "bottom", ["black"], ["all"], ["casual", "通勤"], "", 6, 1, "clean", 3],
    ["灰色阔腿裤", "bottom", ["gray"], ["all"], ["work", "通勤"], "面料垂感好。", 3, 0, "clean", 8],
    ["卡其半裙", "bottom", ["khaki"], ["summer", "spring"], ["date", "casual"], "", 1, 0, "clean", 20],
    ["黑色乐福鞋", "shoes", ["black"], ["all"], ["work", "formal"], "下雨天慎穿。", 4, 0, "clean", 4],
    ["白色运动鞋", "shoes", ["white"], ["all"], ["sport", "casual"], "", 2, 0, "clean", 12],
    ["米色风衣", "outerwear", ["beige"], ["spring", "autumn"], ["通勤"], "小雨可以挡一下。", 2, 0, "clean", 9],
    ["牛仔外套", "outerwear", ["blue"], ["spring", "autumn"], ["casual"], "", 1, 0, "clean", 30],
    ["黑色托特包", "bag", ["black"], ["all"], ["work"], "", 3, 0, "clean", 5],
    ["细项链", "accessory", ["beige"], ["all"], ["date"], "", 0, 0, "clean", 40],
  ] as const;

  const items = [];
  for (const [name, category, colors, seasons, tags, notes, wearCount, wearsSinceWash, washStatus, ago] of specs) {
    const lastWornAt = wearCount > 0 ? daysAgo(ago) : null;
    const item = await prisma.item.create({
      data: {
        userId: user.id,
        profileId,
        name,
        category,
        colors: [...colors],
        seasons: [...seasons],
        tags: [...tags],
        notes: notes || null,
        searchText: [name, category, ...colors, ...seasons, ...tags, notes].join(" ").toLowerCase(),
        washStatus,
        wearsSinceWash,
        wearCount,
        lastWornAt,
        favorite: name === "棕色短袖衬衫",
      },
    });
    items.push(item);
    if (wearCount > 0 && lastWornAt) {
      await prisma.wearLog.create({
        data: {
          userId: user.id,
          profileId,
          itemId: item.id,
          groupId: `seed-${item.id}`,
          wornOn: lastWornAt,
        },
      });
    }
  }

  const shirt = items.find((item) => item.name === "棕色短袖衬衫");
  const jeans = items.find((item) => item.name === "黑色直筒牛仔裤");
  const loafers = items.find((item) => item.name === "黑色乐福鞋");
  const coat = items.find((item) => item.name === "米色风衣");
  if (shirt && jeans && loafers && coat) {
    await prisma.outfit.create({
      data: {
        userId: user.id,
        profileId,
        name: "雨天通勤",
        occasion: "work",
        tip: "衬衫塞进牛仔裤，风衣敞着穿。",
        items: {
          create: [
            { itemId: shirt.id, slot: "top" },
            { itemId: jeans.id, slot: "bottom" },
            { itemId: loafers.id, slot: "shoes" },
            { itemId: coat.id, slot: "outerwear" },
          ],
        },
      },
    });
  }

  await prisma.suggestionLog.createMany({
    data: [
      {
        userId: user.id,
        profileId,
        occasion: "work",
        name: "通勤 · 藏青针织",
        reasons: ["气温适合一层针织。", "优先干净的衣服。"],
        tip: "包可以换黑色托特。",
        itemIds: items.slice(0, 3).map((item) => item.id),
        signature: "seed-loved",
        verdict: "loved",
        createdAt: daysAgo(3),
      },
      {
        userId: user.id,
        profileId,
        occasion: "date",
        name: "约会 · 卡其半裙",
        reasons: ["颜色太接近。"],
        tip: "加一件深色外套。",
        itemIds: items.slice(3, 6).map((item) => item.id),
        signature: "seed-disliked",
        verdict: "disliked",
        createdAt: daysAgo(10),
      },
    ],
  });

  console.log(`演示账号：${demoEmail} / qiyi-demo-123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { Prisma } from "@prisma/client";
import {
  categoryLabel,
  colorLabel,
  isCategory,
  seasonLabel,
  type Category,
  type Season,
  SEASONS,
  COLORS,
} from "@/lib/constants";
import { buildSearchText, splitTags, uniqueStrings } from "@/lib/json";
import { ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveAi, tagImage, type VisionTags } from "@/lib/ai";
import { removeUpload, saveUpload } from "@/lib/uploads";
import { toItemDTO } from "@/lib/dto";

function readList(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return [] as string[];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return uniqueStrings(parsed.map((item) => String(item)));
    } catch {
      return splitTags(text);
    }
  }
  return splitTags(text);
}

function cleanColors(values: string[]) {
  const allowed = new Set(COLORS.map((color) => color.id));
  return uniqueStrings(values.map((value) => value.toLowerCase())).filter((value) => allowed.has(value as (typeof COLORS)[number]["id"]));
}

function cleanSeasons(values: string[]) {
  const allowed = new Set<string>(SEASONS);
  const seasons = uniqueStrings(values.map((value) => value.toLowerCase())).filter((value): value is Season =>
    allowed.has(value),
  );
  return seasons.length ? seasons : (["all"] as Season[]);
}

function searchFor(input: { name: string; notes: string; category: string; colors: string[]; seasons: string[]; tags: string[] }) {
  return buildSearchText([
    input.name,
    input.notes,
    input.category,
    categoryLabel("zh", input.category),
    categoryLabel("en", input.category),
    ...input.colors.flatMap((color) => [color, colorLabel("zh", color), colorLabel("en", color)]),
    ...input.seasons.flatMap((season) => [season, seasonLabel("zh", season), seasonLabel("en", season)]),
    ...input.tags,
  ]);
}

export async function createItemFromForm(input: {
  userId: string;
  profileId: string;
  locale: string;
  aiUser: {
    aiBaseUrl: string | null;
    aiApiKey: string | null;
    aiVisionModel: string | null;
    aiTextModel: string | null;
  };
  form: FormData;
}) {
  const file = input.form.get("file");
  let imagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    imagePath = (await saveUpload(input.userId, file)).relative;
  }
  let vision: VisionTags | null = null;
  let aiRaw: Prisma.InputJsonValue | undefined;
  const auto = input.form.get("autoTag") === "1" || input.form.get("autoTag") === "true";
  if (auto && imagePath) {
    try {
      const result = await tagImage(resolveAi(input.aiUser), imagePath, input.locale);
      vision = result?.tags ?? null;
      if (result?.raw) aiRaw = result.raw as Prisma.InputJsonValue;
    } catch (error) {
      console.error(error);
    }
  }
  const manualName = String(input.form.get("name") ?? "").trim();
  const categoryValue = String(input.form.get("category") ?? "");
  const category: Category = isCategory(categoryValue) ? categoryValue : vision?.category || "top";
  const colors = cleanColors(readList(input.form.get("colors")));
  const seasons = cleanSeasons(readList(input.form.get("seasons")));
  const tags = readList(input.form.get("tags"));
  const notes = String(input.form.get("notes") ?? "").trim().slice(0, 2000);
  const name = (manualName || vision?.name || "未命名单品").slice(0, 80);
  const finalColors = colors.length ? colors : vision?.colors || [];
  const finalSeasons = String(input.form.get("seasons") ?? "").trim() ? seasons : vision?.seasons || seasons;
  const finalTags = tags.length ? tags : vision?.tags || [];
  try {
    const item = await prisma.item.create({
      data: {
        userId: input.userId,
        profileId: input.profileId,
        name,
        category,
        colors: finalColors,
        seasons: finalSeasons,
        tags: finalTags,
        notes: notes || null,
        searchText: searchFor({ name, notes, category, colors: finalColors, seasons: finalSeasons, tags: finalTags }),
        imagePath,
        aiSummary: vision?.summary || null,
        aiConfidence: vision?.confidence ?? null,
        aiRaw,
      },
    });
    return { item: toItemDTO(item), tagged: Boolean(vision) };
  } catch (error) {
    await removeUpload(imagePath);
    throw error;
  }
}

export async function updateItemFromForm(input: {
  userId: string;
  itemId: string;
  locale: string;
  aiUser: {
    aiBaseUrl: string | null;
    aiApiKey: string | null;
    aiVisionModel: string | null;
    aiTextModel: string | null;
  };
  form: FormData;
}) {
  const existing = await prisma.item.findFirst({ where: { id: input.itemId, userId: input.userId } });
  if (!existing) throw new ApiError(404, "找不到这件衣服");
  const file = input.form.get("file");
  let imagePath = existing.imagePath;
  let uploaded: string | null = null;
  if (file instanceof File && file.size > 0) {
    uploaded = (await saveUpload(input.userId, file)).relative;
    imagePath = uploaded;
  }
  const manualName = String(input.form.get("name") ?? "").trim();
  const categoryValue = String(input.form.get("category") ?? existing.category);
  if (!isCategory(categoryValue)) throw new ApiError(400, "分类不正确");
  const colors = cleanColors(readList(input.form.get("colors")));
  const seasons = cleanSeasons(readList(input.form.get("seasons")));
  const tags = readList(input.form.get("tags"));
  const notes = String(input.form.get("notes") ?? "").trim().slice(0, 2000);
  const name = (manualName || existing.name).slice(0, 80);
  let aiSummary = existing.aiSummary;
  let aiConfidence = existing.aiConfidence;
  let aiRaw: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined =
    existing.aiRaw === null ? undefined : (existing.aiRaw as Prisma.InputJsonValue);
  let tagged = false;
  const auto = input.form.get("autoTag") === "1";
  if (auto && imagePath) {
    try {
      const result = await tagImage(resolveAi(input.aiUser), imagePath, input.locale);
      if (result?.tags) {
        tagged = true;
        aiSummary = result.tags.summary;
        aiConfidence = result.tags.confidence;
        aiRaw = result.raw as Prisma.InputJsonValue;
      }
    } catch (error) {
      console.error(error);
    }
  }
  try {
    const item = await prisma.item.update({
      where: { id: existing.id },
      data: {
        name,
        category: categoryValue,
        colors,
        seasons,
        tags,
        notes: notes || null,
        searchText: searchFor({ name, notes, category: categoryValue, colors, seasons, tags }),
        imagePath,
        aiSummary,
        aiConfidence,
        aiRaw,
      },
    });
    if (uploaded && existing.imagePath && existing.imagePath !== uploaded) await removeUpload(existing.imagePath);
    return { item: toItemDTO(item), tagged };
  } catch (error) {
    await removeUpload(uploaded);
    throw error;
  }
}

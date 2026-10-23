import type { Item } from "@prisma/client";
import {
  NEUTRAL_COLORS,
  categoryLabel,
  occasionLabel,
  type Occasion,
} from "@/lib/constants";
import { asStringArray } from "@/lib/json";
import { toItemDTO } from "@/lib/dto";
import type { ItemDTO, WeatherDTO } from "@/lib/types";
import { seasonForWeather } from "@/lib/weather";
import { nameOutfit, resolveAi, type AiConfig } from "@/lib/ai";

const OCCASION_TAGS: Record<Occasion, string[]> = {
  casual: ["casual", "日常", "休闲"],
  work: ["work", "通勤", "正式", "smart"],
  date: ["date", "约会", "smart"],
  sport: ["sport", "运动", "athletic"],
  formal: ["formal", "正式", "work"],
  home: ["home", "居家", "lounge"],
  travel: ["travel", "出行", "casual"],
};

function scoreItem(item: Item, season: string, occasion: Occasion, weather: WeatherDTO | null) {
  let score = 0;
  if (item.washStatus === "clean") score += 4;
  if (item.washStatus === "needs_wash") score -= 3;
  if (item.favorite) score += 1;
  const seasons = asStringArray(item.seasons);
  if (seasons.includes("all") || seasons.includes(season)) score += 4;
  else if (seasons.length > 0) score -= 2;
  if (!item.lastWornAt) score += 2;
  else {
    const days = (Date.now() - item.lastWornAt.getTime()) / 86400000;
    score += Math.min(5, days / 6);
  }
  const tags = asStringArray(item.tags).map((tag) => tag.toLowerCase());
  if (OCCASION_TAGS[occasion].some((tag) => tags.includes(tag))) score += 3;
  if (weather && weather.temperature >= 27 && item.category === "outerwear") score -= 5;
  if (weather && weather.temperature <= 16 && item.category === "outerwear") score += 3;
  if (weather && weather.precipProb >= 50 && tags.some((tag) => tag.includes("suede") || tag.includes("麂皮"))) {
    score -= 4;
  }
  return score;
}

function ranked(items: Item[], category: string, season: string, occasion: Occasion, weather: WeatherDTO | null) {
  return items
    .filter((item) => item.category === category && item.washStatus !== "washing")
    .map((item) => ({ item, score: scoreItem(item, season, occasion, weather) }))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
}

function clash(items: Item[]) {
  const primaries = items.map((item) => asStringArray(item.colors)[0]).filter(Boolean) as string[];
  const vivid = primaries.filter((color) => !NEUTRAL_COLORS.has(color));
  return new Set(vivid).size >= 3 ? 2 : 0;
}

function signatureOf(items: Item[]) {
  return items.map((item) => item.id).sort().join(".");
}

export type BuiltOutfit = {
  items: Item[];
  missing: string[];
  signature: string;
  repeated: boolean;
};

export function buildOutfit(input: {
  items: Item[];
  occasion: Occasion;
  weather: WeatherDTO | null;
  month: number;
  locale: string;
  exclude: string[];
}): BuiltOutfit | null {
  const season = seasonForWeather(input.weather, input.month);
  const usable = input.items.filter((item) => item.washStatus !== "washing");
  const tops = ranked(usable, "top", season, input.occasion, input.weather).slice(0, 4);
  const bottoms = ranked(usable, "bottom", season, input.occasion, input.weather).slice(0, 4);
  const dresses = ranked(usable, "dress", season, input.occasion, input.weather).slice(0, 3);
  const shoes = ranked(usable, "shoes", season, input.occasion, input.weather).slice(0, 3);
  const outers = ranked(usable, "outerwear", season, input.occasion, input.weather).slice(0, 3);
  const bags = ranked(usable, "bag", season, input.occasion, input.weather).slice(0, 2);
  const accessories = ranked(usable, "accessory", season, input.occasion, input.weather).slice(0, 2);
  const wantOuter =
    !input.weather || input.weather.temperature < 18 || input.weather.precipProb >= 45 || season === "winter";

  type Candidate = { items: Item[]; score: number };
  const candidates: Candidate[] = [];
  const shoeChoices = shoes.length ? shoes : [{ item: null as Item | null, score: 0 }];

  for (const dress of dresses) {
    for (const shoe of shoeChoices) {
      const pieces = [dress.item, shoe.item].filter((item): item is Item => Boolean(item));
      let score = dress.score + shoe.score;
      if (wantOuter && outers[0]) {
        pieces.push(outers[0].item);
        score += outers[0].score;
      }
      if (bags[0]) pieces.push(bags[0].item);
      score -= clash(pieces);
      candidates.push({ items: pieces, score });
    }
  }
  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoeChoices) {
        const pieces = [top.item, bottom.item, shoe.item].filter((item): item is Item => Boolean(item));
        let score = top.score + bottom.score + shoe.score;
        if (wantOuter && outers[0] && outers[0].item.id !== top.item.id) {
          pieces.push(outers[0].item);
          score += outers[0].score;
        } else if (!wantOuter && accessories[0]) {
          pieces.push(accessories[0].item);
        }
        if (bags[0]) pieces.push(bags[0].item);
        score -= clash(pieces);
        candidates.push({ items: pieces, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score || signatureOf(a.items).localeCompare(signatureOf(b.items)));
  const excluded = new Set(input.exclude);
  let chosen = candidates.find((candidate) => !excluded.has(signatureOf(candidate.items)));
  let repeated = false;
  if (!chosen && candidates[0]) {
    chosen = candidates[0];
    repeated = excluded.has(signatureOf(chosen.items));
  }
  if (!chosen) return null;
  const categories = new Set(chosen.items.map((item) => item.category));
  const missing: string[] = [];
  const hasBody = categories.has("dress") || (categories.has("top") && categories.has("bottom"));
  if (!hasBody) return null;
  if (!categories.has("shoes")) missing.push(categoryLabel(input.locale, "shoes"));
  if (wantOuter && !categories.has("outerwear")) missing.push(categoryLabel(input.locale, "outerwear"));
  return { items: chosen.items, missing, signature: signatureOf(chosen.items), repeated };
}

export function fallbackCopy(input: {
  locale: string;
  occasion: Occasion;
  weather: WeatherDTO | null;
  items: ItemDTO[];
  missing: string[];
}) {
  const zh = input.locale !== "en";
  const occasion = occasionLabel(input.locale, input.occasion);
  const main = input.items[0];
  const color = main?.colors[0];
  const name = zh
    ? `${occasion}的${color ? "" : ""}一套`
    : `${occasion} outfit`;
  const titled = zh
    ? `${occasion}${main ? ` · ${main.name}` : ""}`
    : `${occasion}${main ? ` · ${main.name}` : ""}`;
  const reasons: string[] = [];
  if (input.weather) {
    reasons.push(
      zh
        ? `${input.weather.labelZh}，${input.weather.temperature}°C，体感 ${input.weather.apparent}°C。`
        : `${input.weather.labelEn}, ${input.weather.temperature}°C, feels ${input.weather.apparent}°C.`,
    );
  } else {
    reasons.push(zh ? "按当前季节挑选了还能穿的衣服。" : "Picked for the current season from clothes that are wearable.");
  }
  reasons.push(
    zh
      ? "优先用了干净、最近没怎么穿的单品。"
      : "Clean pieces you have not worn lately come first.",
  );
  if (input.weather && input.weather.precipProb >= 40) {
    reasons.push(zh ? "降雨概率不低，出门记得看一眼外套和鞋。" : "Rain is fairly likely, so check the layer and the shoes.");
  } else if (input.items.some((item) => item.favorite)) {
    reasons.push(zh ? "里面有你标过喜欢的衣服。" : "It includes a piece you marked as a favorite.");
  } else {
    reasons.push(zh ? "颜色尽量收在一起，避免抢来抢去。" : "Colors stay close so nothing fights for attention.");
  }
  const tip = zh
    ? input.occasion === "work"
      ? "上衣塞进裤腰一半，通勤会更利落。"
      : input.occasion === "date"
        ? "少加一件配饰就够，把注意力留在版型上。"
        : "如果要走路，先确认鞋子穿过、不磨脚。"
    : input.occasion === "work"
      ? "A half tuck keeps this sharp for the office."
      : input.occasion === "date"
        ? "One accessory is enough. Let the cut do the work."
        : "If you will be walking, pick shoes you already trust.";
  return { name: titled || name, reasons: reasons.slice(0, 3), tip };
}

export async function describeOutfit(input: {
  locale: string;
  occasion: Occasion;
  weather: WeatherDTO | null;
  items: Item[];
  missing: string[];
  ai: AiConfig;
}) {
  const dtos = input.items.map(toItemDTO);
  const fallback = fallbackCopy({
    locale: input.locale,
    occasion: input.occasion,
    weather: input.weather,
    items: dtos,
    missing: input.missing,
  });
  const weatherText = input.weather
    ? `${input.weather.temperature}C feels ${input.weather.apparent}C rain ${input.weather.precipProb}% ${input.weather.labelEn}`
    : "unknown";
  const named = await nameOutfit(input.ai, {
    locale: input.locale,
    occasion: input.occasion,
    weatherText,
    items: dtos.map((item) => ({ name: item.name, category: item.category, colors: item.colors })),
  });
  return {
    items: dtos,
    name: named?.name || fallback.name,
    reasons: named?.reasons || fallback.reasons,
    tip: named?.tip || fallback.tip,
  };
}

export function aiFor(user: {
  aiBaseUrl: string | null;
  aiApiKey: string | null;
  aiVisionModel: string | null;
  aiTextModel: string | null;
}) {
  return resolveAi(user);
}

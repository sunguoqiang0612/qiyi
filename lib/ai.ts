import fs from "fs/promises";
import { absoluteUpload } from "@/lib/uploads";
import {
  CATEGORIES,
  COLORS,
  SEASONS,
  isCategory,
  type Category,
  type Season,
} from "@/lib/constants";
import { asStringArray, uniqueStrings } from "@/lib/json";

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  vision: string;
  text: string;
  visionEnabled: boolean;
  textEnabled: boolean;
};

type AiUser = {
  aiBaseUrl: string | null;
  aiApiKey: string | null;
  aiVisionModel: string | null;
  aiTextModel: string | null;
};

export function resolveAi(user?: AiUser | null): AiConfig {
  const baseUrl = (user?.aiBaseUrl || process.env.AI_BASE_URL || "").trim().replace(/\/$/, "");
  const apiKey = (user?.aiApiKey || process.env.AI_API_KEY || "").trim();
  const vision = (user?.aiVisionModel || process.env.AI_VISION_MODEL || "").trim();
  const text = (user?.aiTextModel || process.env.AI_TEXT_MODEL || vision).trim();
  return {
    baseUrl,
    apiKey,
    vision,
    text,
    visionEnabled: Boolean(baseUrl && apiKey && vision),
    textEnabled: Boolean(baseUrl && apiKey && text),
  };
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("模型没有返回 JSON");
  }
}

/** OpenAI-compatible chat/completions. Vision models such as Zhipu can exceed 25s. */
const CHAT_TIMEOUT_MS = 60_000;

async function chat(config: AiConfig, model: string, messages: unknown[]) {
  const payload = { model, messages, temperature: 0.2 };
  const send = async (withFormat: boolean) => {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        withFormat ? { ...payload, response_format: { type: "json_object" } } : payload,
      ),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
    return response;
  };
  let response = await send(true);
  if (response.status === 400) response = await send(false);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail.slice(0, 300) || "模型请求失败");
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  return extractJson(content);
}

export type VisionTags = {
  name: string;
  category: Category;
  colors: string[];
  seasons: Season[];
  tags: string[];
  summary: string;
  confidence: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeVision(value: unknown): VisionTags | null {
  const raw = asRecord(value);
  const categoryValue = String(raw.category ?? "other");
  const category = isCategory(categoryValue) ? categoryValue : "other";
  const allowedColors = new Set(COLORS.map((color) => color.id));
  const colors = uniqueStrings(asStringArray(raw.colors).map((color) => color.toLowerCase())).filter((color) =>
    allowedColors.has(color as (typeof COLORS)[number]["id"]),
  );
  const allowedSeasons = new Set<string>(SEASONS);
  const seasons = uniqueStrings(asStringArray(raw.seasons).map((season) => season.toLowerCase())).filter(
    (season): season is Season => allowedSeasons.has(season),
  );
  const confidence = Math.max(0, Math.min(100, Math.round(Number(raw.confidence) || 0)));
  const name = String(raw.name ?? "").trim().slice(0, 80);
  const summary = String(raw.summary ?? raw.description ?? "").trim().slice(0, 600);
  if (!name && colors.length === 0 && !summary) return null;
  return {
    name: name || "未命名单品",
    category,
    colors,
    seasons: seasons.length ? seasons : ["all"],
    tags: uniqueStrings(asStringArray(raw.tags)),
    summary,
    confidence: confidence || 60,
  };
}

export async function tagImage(config: AiConfig, imagePath: string, locale: string) {
  if (!config.visionEnabled) return null;
  const full = absoluteUpload(imagePath);
  if (!full) return null;
  const bytes = await fs.readFile(full);
  const ext = full.split(".").pop()?.toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
  const language = locale === "en" ? "English" : "Simplified Chinese";
  const prompt = [
    "You tag one clothing photo for a wardrobe app.",
    `Write name, summary, and tags in ${language}.`,
    `Return JSON with keys name, category, colors, seasons, tags, summary, confidence.`,
    `category must be one of: ${CATEGORIES.join(", ")}.`,
    `colors must be chosen from: ${COLORS.map((color) => color.id).join(", ")}.`,
    `seasons must be chosen from: ${SEASONS.join(", ")}.`,
    "confidence is an integer from 0 to 100.",
    "summary is one sentence about cut, pattern, and how it is worn.",
  ].join(" ");
  const raw = await chat(config, config.vision, [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mime};base64,${bytes.toString("base64")}` } },
      ],
    },
  ]);
  return { tags: normalizeVision(raw), raw };
}

export async function nameOutfit(
  config: AiConfig,
  input: {
    locale: string;
    occasion: string;
    weatherText: string;
    items: { name: string; category: string; colors: string[] }[];
  },
) {
  if (!config.textEnabled) return null;
  const language = input.locale === "en" ? "English" : "Simplified Chinese";
  const prompt = [
    `Name a real outfit in ${language}.`,
    "Return JSON: { name, reasons: string[3], tip }.",
    "reasons are short practical sentences. tip is one styling note.",
    `Occasion: ${input.occasion}. Weather: ${input.weatherText}.`,
    `Pieces: ${input.items.map((item) => `${item.name} (${item.category}, ${item.colors.join("/")})`).join("; ")}.`,
  ].join(" ");
  try {
    const raw = asRecord(await chat(config, config.text, [{ role: "user", content: prompt }]));
    const reasons = asStringArray(raw.reasons).slice(0, 3);
    const name = String(raw.name ?? "").trim().slice(0, 80);
    const tip = String(raw.tip ?? "").trim().slice(0, 240);
    if (!name || reasons.length === 0) return null;
    return { name, reasons, tip };
  } catch (error) {
    console.error("text model failed", error);
    return null;
  }
}

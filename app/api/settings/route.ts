import { requireApiUser, setPrefCookies } from "@/lib/auth";
import { maskKey } from "@/lib/dto";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { resolveAi } from "@/lib/ai";
import { prisma } from "@/lib/prisma";

function textOrNull(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const ai = resolveAi(user);
    return ok({
      name: user.name,
      email: user.email,
      locale: user.locale,
      theme: user.theme,
      city: user.city ?? "",
      latitude: user.latitude,
      longitude: user.longitude,
      washThreshold: user.washThreshold,
      aiBaseUrl: user.aiBaseUrl ?? "",
      aiVisionModel: user.aiVisionModel ?? "",
      aiTextModel: user.aiTextModel ?? "",
      aiApiKeySet: Boolean(user.aiApiKey),
      aiApiKeyMask: user.aiApiKey ? maskKey(user.aiApiKey) : "",
      ntfyUrl: user.ntfyUrl ?? "",
      emailNotify: user.emailNotify,
      envAi: {
        base: Boolean(process.env.AI_BASE_URL),
        key: Boolean(process.env.AI_API_KEY),
        vision: Boolean(process.env.AI_VISION_MODEL),
        text: Boolean(process.env.AI_TEXT_MODEL || process.env.AI_VISION_MODEL),
      },
      effective: { vision: ai.visionEnabled, text: ai.textEnabled },
    });
  });
}

export async function PATCH(request: Request) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const body = await readJson(request);
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (name.length < 1 || name.length > 40) throw new ApiError(400, "名字请控制在 40 字以内");
      data.name = name;
    }
    if (body.locale === "zh" || body.locale === "en") data.locale = body.locale;
    if (body.theme === "light" || body.theme === "dark" || body.theme === "system") data.theme = body.theme;
    if ("city" in body) data.city = textOrNull(body.city, 80);
    if ("latitude" in body) {
      if (body.latitude === null || body.latitude === "") data.latitude = null;
      else {
        const latitude = Number(body.latitude);
        if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) throw new ApiError(400, "纬度不正确");
        data.latitude = latitude;
      }
    }
    if ("longitude" in body) {
      if (body.longitude === null || body.longitude === "") data.longitude = null;
      else {
        const longitude = Number(body.longitude);
        if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) throw new ApiError(400, "经度不正确");
        data.longitude = longitude;
      }
    }
    if ("washThreshold" in body) {
      const threshold = Number(body.washThreshold);
      if (!Number.isInteger(threshold) || threshold < 1 || threshold > 30) {
        throw new ApiError(400, "清洗次数请设在 1 到 30");
      }
      data.washThreshold = threshold;
    }
    if ("aiBaseUrl" in body) {
      const url = textOrNull(body.aiBaseUrl, 255);
      if (url && !/^https?:\/\//.test(url)) throw new ApiError(400, "接口地址需要以 http:// 或 https:// 开头");
      data.aiBaseUrl = url ?? null;
    }
    if ("aiVisionModel" in body) data.aiVisionModel = textOrNull(body.aiVisionModel, 120);
    if ("aiTextModel" in body) data.aiTextModel = textOrNull(body.aiTextModel, 120);
    if ("ntfyUrl" in body) {
      const url = textOrNull(body.ntfyUrl, 255);
      if (url && !/^https?:\/\//.test(url)) throw new ApiError(400, "ntfy 地址需要以 http:// 或 https:// 开头");
      data.ntfyUrl = url ?? null;
    }
    if (typeof body.emailNotify === "boolean") data.emailNotify = body.emailNotify;
    if (body.clearAiKey === true) data.aiApiKey = null;
    else if (typeof body.aiApiKey === "string" && body.aiApiKey.trim()) data.aiApiKey = body.aiApiKey.trim();

    const updated = await prisma.user.update({ where: { id: user.id }, data });
    await setPrefCookies(updated.locale, updated.theme);
    return ok({ ok: true, locale: updated.locale, theme: updated.theme });
  });
}

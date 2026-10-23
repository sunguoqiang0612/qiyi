import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isOccasion, type Occasion } from "@/lib/constants";
import { shanghaiParts, shanghaiStartOfToday } from "@/lib/dates";
import { fetchWeather } from "@/lib/weather";
import { aiFor, buildOutfit, describeOutfit } from "@/lib/suggest";
import { sendMail, smtpConfigured } from "@/lib/mail";
import type { SuggestionDTO, WeatherDTO } from "@/lib/types";

const DEFAULT_LAT = 39.9042;
const DEFAULT_LON = 116.4074;

type UserWithProfiles = User & { profiles: { id: string; name: string }[] };

export async function weatherFor(user: User) {
  const latitude = user.latitude ?? DEFAULT_LAT;
  const longitude = user.longitude ?? DEFAULT_LON;
  const weather = await fetchWeather(latitude, longitude);
  return {
    weather,
    usedDefault: user.latitude == null || user.longitude == null,
    city: user.city || (user.latitude == null ? "北京" : ""),
  };
}

export async function createSuggestion(input: {
  user: UserWithProfiles;
  profileId: string;
  occasion: string;
  exclude?: string[];
}) {
  const occasion: Occasion = isOccasion(input.occasion) ? input.occasion : "casual";
  const items = await prisma.item.findMany({
    where: { userId: input.user.id, profileId: input.profileId },
  });
  const report = await weatherFor(input.user);
  const month = Number(shanghaiParts().month);
  const built = buildOutfit({
    items,
    occasion,
    weather: report.weather,
    month,
    locale: input.user.locale,
    exclude: input.exclude ?? [],
  });
  if (!built) {
    return { suggestion: null as SuggestionDTO | null, weather: report };
  }
  const described = await describeOutfit({
    locale: input.user.locale,
    occasion,
    weather: report.weather,
    items: built.items,
    missing: built.missing,
    ai: aiFor(input.user),
  });
  const log = await prisma.suggestionLog.create({
    data: {
      userId: input.user.id,
      profileId: input.profileId,
      occasion,
      weather: report.weather ?? undefined,
      name: described.name,
      reasons: described.reasons,
      tip: described.tip,
      itemIds: described.items.map((item) => item.id),
      signature: built.signature,
    },
  });
  const suggestion: SuggestionDTO = {
    id: log.id,
    name: described.name,
    occasion,
    reasons: described.reasons,
    tip: described.tip,
    items: described.items,
    missing: built.missing,
    repeated: built.repeated,
    verdict: null,
    signature: built.signature,
    weather: report.weather,
  };
  return { suggestion, weather: report };
}

function suggestionText(name: string, reasons: string[], tip: string, weather: WeatherDTO | null, locale: string) {
  const weatherLine = weather
    ? locale === "en"
      ? `${weather.labelEn} ${weather.temperature}°C`
      : `${weather.labelZh} ${weather.temperature}°C`
    : "";
  return [name, weatherLine, ...reasons, tip].filter(Boolean).join("\n");
}

export async function remindUser(userId: string, force = false) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profiles: true },
  });
  if (!user) return null;
  const profile = user.profiles.find((item) => item.id === user.activeProfileId) ?? user.profiles[0];
  if (!profile) return null;
  if (!force) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        createdAt: { gte: shanghaiStartOfToday() },
        title: { startsWith: "今日搭配" },
      },
    });
    if (existing) return existing;
  }
  const count = await prisma.item.count({ where: { userId, profileId: profile.id } });
  if (count < 2) return null;
  const { suggestion, weather } = await createSuggestion({
    user,
    profileId: profile.id,
    occasion: "casual",
  });
  if (!suggestion) return null;
  const title = user.locale === "en" ? `Today · ${suggestion.name}` : `今日搭配 · ${suggestion.name}`;
  const body = suggestionText(suggestion.name, suggestion.reasons, suggestion.tip, weather.weather, user.locale);
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const fullBody = appUrl ? `${body}\n${appUrl}/suggest` : body;
  const notification = await prisma.notification.create({
    data: { userId, title: title.slice(0, 120), body: fullBody },
  });
  const ntfy = user.ntfyUrl || process.env.NTFY_URL;
  if (ntfy) {
    await fetch(ntfy, {
      method: "POST",
      headers: {
        Title: title,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: fullBody,
    }).catch((error) => console.error("ntfy failed", error));
  }
  if (user.emailNotify && smtpConfigured()) {
    await sendMail(user.email, title, fullBody).catch((error) => console.error("mail failed", error));
  }
  return notification;
}

export async function remindAll() {
  const users = await prisma.user.findMany({ select: { id: true } });
  let sent = 0;
  for (const user of users) {
    try {
      const result = await remindUser(user.id, false);
      if (result) sent += 1;
    } catch (error) {
      console.error("daily remind failed", user.id, error);
    }
  }
  return sent;
}


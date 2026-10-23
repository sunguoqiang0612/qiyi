import type { WeatherDTO } from "@/lib/types";

const cache = new Map<string, { at: number; data: WeatherDTO }>();

const LABELS: Record<number, { zh: string; en: string }> = {
  0: { zh: "晴", en: "Clear" },
  1: { zh: "大部晴朗", en: "Mostly clear" },
  2: { zh: "多云", en: "Partly cloudy" },
  3: { zh: "阴", en: "Overcast" },
  45: { zh: "有雾", en: "Fog" },
  48: { zh: "雾凇", en: "Rime fog" },
  51: { zh: "小毛毛雨", en: "Light drizzle" },
  53: { zh: "毛毛雨", en: "Drizzle" },
  55: { zh: "大毛毛雨", en: "Heavy drizzle" },
  61: { zh: "小雨", en: "Light rain" },
  63: { zh: "中雨", en: "Rain" },
  65: { zh: "大雨", en: "Heavy rain" },
  71: { zh: "小雪", en: "Light snow" },
  73: { zh: "中雪", en: "Snow" },
  75: { zh: "大雪", en: "Heavy snow" },
  80: { zh: "阵雨", en: "Showers" },
  81: { zh: "强阵雨", en: "Heavy showers" },
  82: { zh: "暴雨", en: "Violent showers" },
  95: { zh: "雷雨", en: "Thunderstorm" },
};

function weatherLabel(code: number) {
  if (LABELS[code]) return LABELS[code];
  if (code >= 50 && code < 60) return { zh: "毛毛雨", en: "Drizzle" };
  if (code >= 60 && code < 70) return { zh: "下雨", en: "Rain" };
  if (code >= 70 && code < 80) return { zh: "下雪", en: "Snow" };
  if (code >= 80 && code < 90) return { zh: "阵雨", en: "Showers" };
  if (code >= 95) return { zh: "雷雨", en: "Thunderstorm" };
  return { zh: "多云", en: "Cloudy" };
}

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherDTO | null> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.data;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
  );
  url.searchParams.set("timezone", "auto");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        precipitation_probability?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };
    const current = body.current;
    if (!current || typeof current.temperature_2m !== "number") return null;
    const labels = weatherLabel(current.weather_code ?? 2);
    const data: WeatherDTO = {
      temperature: Math.round(current.temperature_2m * 10) / 10,
      apparent: Math.round((current.apparent_temperature ?? current.temperature_2m) * 10) / 10,
      precipProb: Math.round(current.precipitation_probability ?? 0),
      code: current.weather_code ?? 2,
      wind: Math.round(current.wind_speed_10m ?? 0),
      labelZh: labels.zh,
      labelEn: labels.en,
    };
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

export function seasonForWeather(weather: WeatherDTO | null, month: number) {
  if (weather) {
    if (weather.temperature <= 8 || weather.code >= 71 && weather.code < 80) return "winter";
    if (weather.temperature >= 26) return "summer";
    if (weather.temperature <= 16) return month >= 8 ? "autumn" : "spring";
  }
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

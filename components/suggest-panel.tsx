"use client";

import { useEffect, useState } from "react";
import { CloudRain, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { OCCASIONS, categoryLabel, occasionLabel } from "@/lib/constants";
import type { SuggestionDTO, WeatherDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { ItemVisual } from "@/components/item-visual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WeatherPack = {
  weather: WeatherDTO | null;
  usedDefault: boolean;
  city: string;
};

export function SuggestPanel() {
  const { t, locale } = useI18n();
  const [occasion, setOccasion] = useState("casual");
  const [weatherPack, setWeatherPack] = useState<WeatherPack | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionDTO | null>(null);
  const [exclude, setExclude] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    setHour(new Date().getHours());
    api<WeatherPack>("/api/weather").then(setWeatherPack).catch(() => setWeatherPack({ weather: null, usedDefault: false, city: "" }));
  }, []);

  const greeting =
    hour == null
      ? t("suggestKicker")
      : hour < 5
        ? t("greetNight")
        : hour < 11
          ? t("greetMorning")
          : hour < 14
            ? t("greetNoon")
            : hour < 18
              ? t("greetAfternoon")
              : t("greetEvening");

  async function generate(nextExclude: string[]) {
    setPending(true);
    try {
      if (suggestion && !suggestion.verdict) {
        await api(`/api/suggest/${suggestion.id}/verdict`, {
          method: "POST",
          body: JSON.stringify({ verdict: "skipped" }),
        }).catch(() => undefined);
      }
      const result = await api<{ suggestion: SuggestionDTO | null; weather: WeatherPack }>("/api/suggest", {
        method: "POST",
        body: JSON.stringify({ occasion, exclude: nextExclude }),
      });
      setWeatherPack(result.weather);
      setSuggestion(result.suggestion);
      if (!result.suggestion) toast.message(t("needMoreClothes"));
      else if (result.suggestion.repeated) toast.message(t("repeatedOutfit"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  async function vote(verdict: "loved" | "disliked") {
    if (!suggestion) return;
    setPending(true);
    try {
      await api(`/api/suggest/${suggestion.id}/verdict`, {
        method: "POST",
        body: JSON.stringify({ verdict }),
      });
      setSuggestion({ ...suggestion, verdict });
      toast.success(verdict === "loved" ? t("lovedSaved") : t("dislikedNoted"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  const weather = suggestion?.weather ?? weatherPack?.weather ?? null;
  const label = weather ? (locale === "en" ? weather.labelEn : weather.labelZh) : "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("suggestSubtitle")}</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setSuggestion(null);
            setExclude([]);
          }}
        >
          {t("startOver")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-card px-4 py-3 text-sm">
        {weather ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Thermometer className="size-4" />
              {weather.temperature}°C
              <span className="text-muted-foreground">({t("feelsLike", { n: weather.apparent })})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CloudRain className="size-4" />
              {t("rainProb", { n: weather.precipProb })}
            </span>
            <Badge variant="secondary">{label}</Badge>
          </>
        ) : (
          <span className="text-muted-foreground">{t("weatherUnavailable")}</span>
        )}
        {weatherPack?.usedDefault ? <span className="text-xs text-muted-foreground">{t("defaultCity")}</span> : null}
        {weatherPack?.city ? <span className="ml-auto text-xs text-muted-foreground">{weatherPack.city}</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setOccasion(id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              occasion === id ? "border-foreground bg-foreground text-background" : "bg-card",
            )}
          >
            {occasionLabel(locale, id)}
          </button>
        ))}
      </div>
      {!suggestion ? (
        <div className="rounded-2xl border bg-card px-6 py-10 text-center">
          <h2 className="text-lg font-medium">{t("suggestKicker")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("needMoreClothes")}</p>
          <Button className="mt-4 h-10" disabled={pending} onClick={() => void generate(exclude)}>
            {pending ? t("generating") : t("generate")}
          </Button>
        </div>
      ) : (
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="text-sm text-muted-foreground">{t("yourOutfit")}</div>
          <h2 className="mt-1 text-xl font-semibold">{suggestion.name}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {suggestion.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {suggestion.items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl border bg-background">
                <div className="aspect-[4/5] bg-[#ece7df] dark:bg-[#2a2723]">
                  <ItemVisual item={item} />
                </div>
                <div className="px-3 py-2 text-sm">{categoryLabel(locale, item.category)}</div>
              </div>
            ))}
          </div>
          {suggestion.missing.length ? (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">{t("missingPieces", { items: suggestion.missing.join(locale === "en" ? ", " : "、") })}</p>
          ) : null}
          {suggestion.tip ? (
            <div className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm">
              <span className="font-medium">{t("tip")}：</span>
              {suggestion.tip}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              className="h-10"
              disabled={pending}
              onClick={() => {
                const next = [...exclude, suggestion.signature];
                setExclude(next);
                void generate(next);
              }}
            >
              {t("tryAnother")}
            </Button>
            <Button className="h-10" disabled={pending || suggestion.verdict === "loved"} onClick={() => void vote("loved")}>
              {t("loveIt")}
            </Button>
            <Button variant="ghost" className="h-10" disabled={pending || suggestion.verdict === "disliked"} onClick={() => void vote("disliked")}>
              {t("dislike")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

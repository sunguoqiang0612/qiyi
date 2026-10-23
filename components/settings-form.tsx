"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { CITIES } from "@/lib/constants";
import type { SettingsDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({ initial }: { initial: SettingsDTO }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { setTheme } = useTheme();
  const [form, setForm] = useState(initial);
  const [aiApiKey, setAiApiKey] = useState("");
  const [clearAiKey, setClearAiKey] = useState(false);
  const [pending, setPending] = useState(false);

  function set<K extends keyof SettingsDTO>(key: K, value: SettingsDTO[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          locale: form.locale,
          theme: form.theme,
          city: form.city,
          latitude: form.latitude,
          longitude: form.longitude,
          washThreshold: Number(form.washThreshold),
          aiBaseUrl: form.aiBaseUrl,
          aiVisionModel: form.aiVisionModel,
          aiTextModel: form.aiTextModel,
          ntfyUrl: form.ntfyUrl,
          emailNotify: form.emailNotify,
          aiApiKey,
          clearAiKey,
        }),
      });
      setTheme(form.theme);
      document.cookie = `qiyi_locale=${form.locale}; path=/; max-age=31536000`;
      document.cookie = `qiyi_theme=${form.theme}; path=/; max-age=31536000`;
      toast.success(t("saved"));
      setAiApiKey("");
      setClearAiKey(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("settingsTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("settingsSubtitle")}</p>
      </div>
      <section className="grid gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t("account")}</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="name">{t("displayName")}</Label>
          <Input id="name" value={form.name} onChange={(event) => set("name", event.target.value)} />
        </div>
        <div className="text-sm text-muted-foreground">{form.email}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="locale">{t("languageLabel")}</Label>
            <select id="locale" value={form.locale} onChange={(event) => set("locale", event.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm">
              <option value="zh">{t("chinese")}</option>
              <option value="en">{t("english")}</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="theme">{t("themeLabel")}</Label>
            <select id="theme" value={form.theme} onChange={(event) => set("theme", event.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm">
              <option value="light">{t("themeLight")}</option>
              <option value="dark">{t("themeDark")}</option>
              <option value="system">{t("themeSystem")}</option>
            </select>
          </div>
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t("location")}</h2>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <button
              key={city.id}
              type="button"
              className="rounded-full border px-3 py-1 text-sm"
              onClick={() => {
                set("city", locale === "en" ? city.en : city.zh);
                set("latitude", city.lat);
                set("longitude", city.lon);
              }}
            >
              {locale === "en" ? city.en : city.zh}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="city">{t("city")}</Label>
            <Input id="city" value={form.city} onChange={(event) => set("city", event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lat">{t("latitude")}</Label>
            <Input id="lat" value={form.latitude ?? ""} onChange={(event) => set("latitude", event.target.value === "" ? null : Number(event.target.value))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lon">{t("longitude")}</Label>
            <Input id="lon" value={form.longitude ?? ""} onChange={(event) => set("longitude", event.target.value === "" ? null : Number(event.target.value))} />
          </div>
        </div>
        <div className="grid max-w-xs gap-1.5">
          <Label htmlFor="wash">{t("washThreshold")}</Label>
          <Input id="wash" type="number" min={1} max={30} value={form.washThreshold} onChange={(event) => set("washThreshold", Number(event.target.value))} />
          <p className="text-xs text-muted-foreground">{t("washThresholdHint")}</p>
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t("aiSection")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("aiEnvHint", {
            base: initial.envAi.base ? t("yes") : t("no"),
            key: initial.envAi.key ? t("yes") : t("no"),
            vision: initial.envAi.vision ? t("yes") : t("no"),
            text: initial.envAi.text ? t("yes") : t("no"),
          })}
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="base">{t("aiBaseUrl")}</Label>
          <Input id="base" value={form.aiBaseUrl} placeholder="https://api.openai.com/v1" onChange={(event) => set("aiBaseUrl", event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="key">{t("aiApiKey")}</Label>
          <Input id="key" type="password" value={aiApiKey} placeholder={form.aiApiKeySet ? form.aiApiKeyMask : ""} onChange={(event) => setAiApiKey(event.target.value)} autoComplete="off" />
          {form.aiApiKeySet ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={clearAiKey} onCheckedChange={(checked) => setClearAiKey(Boolean(checked))} />
              {t("clearKey")}
            </label>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="vision">{t("aiVisionModel")}</Label>
            <Input id="vision" value={form.aiVisionModel} onChange={(event) => set("aiVisionModel", event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="text-model">{t("aiTextModel")}</Label>
            <Input id="text-model" value={form.aiTextModel} onChange={(event) => set("aiTextModel", event.target.value)} />
          </div>
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t("notifySection")}</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="ntfy">{t("ntfyUrl")}</Label>
          <Input id="ntfy" value={form.ntfyUrl} placeholder="https://ntfy.sh/your-topic" onChange={(event) => set("ntfyUrl", event.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={form.emailNotify} onCheckedChange={(checked) => set("emailNotify", Boolean(checked))} className="mt-0.5" />
          <span>
            {t("emailNotify")}
            <span className="mt-0.5 block text-xs text-muted-foreground">{t("emailNotifyHint")}</span>
          </span>
        </label>
      </section>
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? t("saving") : t("saveSettings")}
      </Button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shirt } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      name: String(form.get("name") ?? ""),
    };
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push("/wardrobe");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("loadFailed");
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  function setLocale(next: "zh" | "en") {
    document.cookie = `qiyi_locale=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between bg-[#16181d] p-10 text-[#f6f1e8] lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-[#16181d]">
            <Shirt className="size-5" />
          </span>
          <div>
            <div className="text-lg font-semibold">{t("appName")}</div>
            <div className="text-sm text-white/55">{t("tagline")}</div>
          </div>
        </div>
        <div className="max-w-md">
          <p className="text-3xl leading-snug font-semibold">把衣服安放好，把今天穿明白。</p>
          <p className="mt-4 text-sm leading-6 text-white/60">
            拍照入库、记下穿过和洗过，再按天气挑一套能出门的搭配。数据留在你自己的服务器上。
          </p>
        </div>
        <p className="text-xs text-white/35">Qiyi · self-hosted wardrobe</p>
      </section>
      <section className="flex flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <Shirt className="size-5" />
            <span className="font-semibold">{t("appName")}</span>
          </div>
          <div className="ml-auto flex gap-1 text-sm">
            <button type="button" className={locale === "zh" ? "font-semibold" : "text-muted-foreground"} onClick={() => setLocale("zh")}>
              {t("chinese")}
            </button>
            <span className="text-muted-foreground">/</span>
            <button type="button" className={locale === "en" ? "font-semibold" : "text-muted-foreground"} onClick={() => setLocale("en")}>
              {t("english")}
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{mode === "login" ? t("loginTitle") : t("registerTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}</p>
          </div>
          {mode === "register" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">{t("displayName")}</Label>
              <Input id="name" name="name" required maxLength={40} autoComplete="name" />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-10" disabled={pending}>
            {pending ? (mode === "login" ? t("loggingIn") : t("creating")) : mode === "login" ? t("login") : t("register")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
            <Link href={mode === "login" ? "/register" : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
              {mode === "login" ? t("register") : t("login")}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

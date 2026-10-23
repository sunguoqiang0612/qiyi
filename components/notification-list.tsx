"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import type { NotificationDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export function NotificationList({ initial }: { initial: NotificationDTO[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [pending, setPending] = useState(false);

  async function markAll() {
    await api("/api/notifications", { method: "POST", body: JSON.stringify({ all: true }) });
    setRows((current) => current.map((row) => ({ ...row, read: true })));
    router.refresh();
  }

  async function remind() {
    setPending(true);
    try {
      const result = await api<{ notification: { id: string; title: string; body: string; createdAt?: string } | null }>("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ remind: true }),
      });
      if (!result.notification) {
        toast.message(t("needMoreClothes"));
      } else {
        toast.success(t("reminded"));
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("notificationsTitle")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void markAll()} disabled={!rows.some((row) => !row.read)}>
            {t("markAllRead")}
          </Button>
          <Button onClick={() => void remind()} disabled={pending}>
            {pending ? t("generating") : t("previewRemind")}
          </Button>
        </div>
      </div>
      {rows.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{t("notificationsEmpty")}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{row.title}</h2>
              {!row.read ? <span className="text-xs text-amber-700">{t("unread")}</span> : null}
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{row.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString(locale === "en" ? "en" : "zh-CN")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

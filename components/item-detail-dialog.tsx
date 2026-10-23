"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { categoryLabel, colorHex, colorLabel, seasonLabel, washLabel } from "@/lib/constants";
import { displayDate } from "@/lib/dates";
import type { ItemDetailDTO, ItemDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { ItemVisual } from "@/components/item-visual";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Heart, RotateCcw, Shirt, Sparkles } from "lucide-react";

export function ItemDetailDialog({
  item,
  onOpenChange,
  onEdit,
  onChanged,
  onDeleted,
}: {
  item: ItemDTO | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: ItemDTO) => void;
  onChanged: (item: ItemDTO) => void;
  onDeleted: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const [detail, setDetail] = useState<ItemDetailDTO | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState("");

  useEffect(() => {
    if (!item) {
      setDetail(null);
      setConfirming(false);
      return;
    }
    let cancelled = false;
    api<ItemDetailDTO>(`/api/items/${item.id}`)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) return null;
  const current = detail?.item && detail.item.id === item.id ? detail.item : item;
  const threshold = detail?.threshold ?? Math.max(current.wearsSinceWash, 3);
  const ratio = Math.min(100, Math.round((current.wearsSinceWash / Math.max(1, threshold)) * 100));
  const maxCount = Math.max(1, ...(detail?.months.map((month) => month.count) ?? [1]));

  async function run(action: string, body?: Record<string, unknown>) {
    if (!item) return;
    setPending(action);
    try {
      const result = await api<{ item: ItemDTO; tagged?: boolean }>(`/api/items/${item.id}/act?action=${action}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      onChanged(result.item);
      if (action === "analyze") toast.success(t("aiApplied"));
      if (action === "wear") toast.success(t("wearLogged"));
      if (action === "undo") toast.success(t("wearUndone"));
      if (action === "wash") toast.success(t("washed"));
      const fresh = await api<ItemDetailDTO>(`/api/items/${item.id}`);
      setDetail(fresh);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending("");
    }
  }

  async function remove() {
    if (!item) return;
    setPending("delete");
    try {
      await api(`/api/items/${item.id}`, { method: "DELETE" });
      toast.success(t("deleted"));
      onDeleted(item.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending("");
    }
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-1.5rem)] overflow-y-auto p-0 sm:max-w-4xl!" showCloseButton>
        <DialogTitle className="sr-only">{current.name}</DialogTitle>
        <DialogDescription className="sr-only">{t("itemDetail")}</DialogDescription>
        <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="min-h-64 bg-[#ece7df] dark:bg-[#2a2723]">
            <ItemVisual item={current} className="h-full max-h-[70vh] w-full object-contain md:max-h-none" />
          </div>
          <div className="flex flex-col gap-4 p-5 pr-12">
            <div className="flex flex-wrap gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={current.favorite ? t("unfavorite") : t("favorite")} onClick={() => void run("favorite")}>
                <Heart className={current.favorite ? "fill-current text-rose-600" : ""} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("logWear")} disabled={pending === "wear"} onClick={() => void run("wear", {})}>
                <Shirt />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("undoWear")} onClick={() => void run("undo")}>
                <RotateCcw />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("reanalyze")} onClick={() => void run("analyze")}>
                <Sparkles />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(current)}>
                {t("edit")}
              </Button>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{current.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {current.colors[0] ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border" style={{ background: colorHex(current.colors[0]) }} />
                    {colorLabel(locale, current.colors[0])}
                  </span>
                ) : null}
                <span>{categoryLabel(locale, current.category)}</span>
              </div>
              <p className="mt-2 text-sm">
                {t("wornTimes", { n: current.wearCount })}
                <span className="text-muted-foreground"> · {t("lastPrefix")} {displayDate(current.lastWornAt, locale)}</span>
              </p>
            </div>
            <section className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{t("washStatus")}</div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => void run("wash", { action: "washed" })}>
                    {t("markWashed")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void run("wash", { action: "needs_wash" })}>
                    {t("markNeedsWash")}
                  </Button>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={current.washStatus === "clean" ? "h-full bg-foreground" : "h-full bg-amber-500"}
                  style={{ width: `${current.washStatus === "washing" ? 100 : ratio}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("wearsSince", { n: current.wearsSinceWash, max: threshold })}</span>
                <span className={current.washStatus === "clean" ? "text-muted-foreground" : "font-medium text-amber-600"}>
                  {washLabel(locale, current.washStatus)}
                </span>
              </div>
            </section>
            <section>
              <h3 className="text-sm font-medium">{t("wearHistory")}</h3>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Stat label={t("totalWears")} value={String(current.wearCount)} />
                <Stat label={t("lastPrefix")} value={displayDate(current.lastWornAt, locale)} />
                <Stat label={t("avgMonth")} value={String(detail?.avgPerMonth ?? 0)} />
              </div>
              <div className="mt-3">
                <div className="mb-1 text-xs text-muted-foreground">{t("last6")}</div>
                <div className="flex h-14 items-end gap-1.5">
                  {(detail?.months ?? []).map((month) => (
                    <div key={month.key} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-10 w-full items-end rounded bg-muted">
                        <div className="w-full rounded bg-foreground/80" style={{ height: `${(month.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{month.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t("aiAnalysis")}</h3>
                {current.aiConfidence != null ? (
                  <span className="text-xs text-muted-foreground">{t("aiConfident", { n: current.aiConfidence })}</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{current.aiSummary || t("noAiYet")}</p>
              {current.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {current.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {current.seasons.length ? (
                <p className="mt-2 text-xs text-muted-foreground">{current.seasons.map((season) => seasonLabel(locale, season)).join(" · ")}</p>
              ) : null}
              {current.notes ? <p className="mt-2 text-sm">{current.notes}</p> : null}
            </section>
            <p className="text-xs text-muted-foreground">{t("addedOn", { date: displayDate(current.createdAt.slice(0, 10), locale) })}</p>
            {confirming ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-destructive/10 p-3 text-sm">
                <span>{t("confirmDeleteItem")}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                    {t("cancel")}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void remove()} disabled={pending === "delete"}>
                    {t("deleteItem")}
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" className="self-start text-sm text-destructive" onClick={() => setConfirming(true)}>
                {t("deleteItem")}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/70 px-2 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { localISODate, monthLabel, shiftMonth } from "@/lib/dates";
import type { WearGroupDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ChoiceItem = { id: string; name: string; category: string; imageUrl: string | null };
type ChoiceOutfit = { id: string; name: string };

export function HistoryPanel({
  month,
  groups,
  days,
  items,
  outfits,
}: {
  month: string;
  groups: WearGroupDTO[];
  days: Record<string, number>;
  items: ChoiceItem[];
  outfits: ChoiceOutfit[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"item" | "outfit">("item");
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [outfitId, setOutfitId] = useState(outfits[0]?.id ?? "");
  const [wornOn, setWornOn] = useState(localISODate());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const startWeekday = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const cells: Array<number | null> = [...Array.from({ length: startWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await api("/api/wear", {
        method: "POST",
        body: JSON.stringify({
          wornOn,
          note,
          itemId: mode === "item" ? itemId : undefined,
          outfitId: mode === "outfit" ? outfitId : undefined,
        }),
      });
      toast.success(t("recorded"));
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div>
        <h1 className="text-2xl font-semibold">{t("historyTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("historySubtitle")}</p>
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl border bg-card p-4">
          <div className="text-sm font-medium">{t("logAWear")}</div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={mode === "item" ? "default" : "outline"} onClick={() => setMode("item")}>
              {t("chooseItem")}
            </Button>
            <Button type="button" size="sm" variant={mode === "outfit" ? "default" : "outline"} onClick={() => setMode("outfit")} disabled={!outfits.length}>
              {t("chooseOutfit")}
            </Button>
          </div>
          {mode === "item" ? (
            <select value={itemId} onChange={(event) => setItemId(event.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm" required>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <select value={outfitId} onChange={(event) => setOutfitId(event.target.value)} className="h-9 rounded-lg border bg-background px-2 text-sm" required>
              {outfits.map((outfit) => (
                <option key={outfit.id} value={outfit.id}>
                  {outfit.name}
                </option>
              ))}
            </select>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="worn-on">{t("wornOn")}</Label>
            <Input id="worn-on" type="date" value={wornOn} onChange={(event) => setWornOn(event.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="wear-note">{t("noteOptional")}</Label>
            <Input id="wear-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <Button type="submit" disabled={pending || (mode === "item" ? !itemId : !outfitId)}>
            {pending ? t("saving") : t("save")}
          </Button>
        </form>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push(`/history?month=${shiftMonth(month, -1)}`)}>
            ‹
          </Button>
          <div className="font-medium">{monthLabel(month, locale)}</div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/history?month=${shiftMonth(month, 1)}`)}>
            ›
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {(locale === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["一", "二", "三", "四", "五", "六", "日"]).map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
          {cells.map((day, index) => {
            const key = day ? `${month}-${String(day).padStart(2, "0")}` : `empty-${index}`;
            const count = day ? days[key] ?? 0 : 0;
            return (
              <div key={key} className={cn("grid h-12 place-items-center rounded-lg border text-sm", day ? "bg-card" : "border-transparent", count > 0 && "border-foreground")}>
                {day ? (
                  <span>
                    {day}
                    {count > 0 ? <span className="mt-0.5 block text-[10px] text-muted-foreground">{count}</span> : null}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-5 space-y-2">
          {groups.length === 0 ? <p className="text-sm text-muted-foreground">{t("noHistory")}</p> : null}
          {groups.map((group) => (
            <article key={group.groupId} className="rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{group.outfitName || group.items.map((item) => item.name || t("unknownItem")).join(locale === "en" ? ", " : "、")}</div>
                <div className="text-xs text-muted-foreground">{group.wornOn}</div>
              </div>
              {group.note ? <p className="mt-1 text-sm text-muted-foreground">{group.note}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

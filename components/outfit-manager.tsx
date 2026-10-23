"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { CATEGORIES, OCCASIONS, categoryLabel, occasionLabel } from "@/lib/constants";
import { localISODate } from "@/lib/dates";
import type { ItemDTO, OutfitDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { ItemVisual } from "@/components/item-visual";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function OutfitManager({ outfits, items }: { outfits: OutfitDTO[]; items: ItemDTO[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("casual");
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const grouped = useMemo(() => CATEGORIES.map((category) => ({ category, items: items.filter((item) => item.category === category) })).filter((group) => group.items.length), [items]);
  const occasionItems = OCCASIONS.map((id) => ({ value: id, label: occasionLabel(locale, id) }));

  function reset() {
    setName("");
    setOccasion("casual");
    setNotes("");
    setPicked([]);
  }

  async function save() {
    if (picked.length < 2) {
      toast.error(t("atLeastTwo"));
      return;
    }
    setPending(true);
    try {
      await api("/api/outfits", {
        method: "POST",
        body: JSON.stringify({ name, occasion, notes, itemIds: picked }),
      });
      toast.success(t("saved"));
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  async function wear(outfit: OutfitDTO) {
    try {
      await api(`/api/outfits/${outfit.id}`, { method: "POST", body: JSON.stringify({ wornOn: localISODate() }) });
      toast.success(t("outfitWorn"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    }
  }

  async function remove(outfit: OutfitDTO) {
    if (!window.confirm(t("confirmDeleteItem"))) return;
    try {
      await api(`/api/outfits/${outfit.id}`, { method: "DELETE" });
      toast.success(t("deleted"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("outfitTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("outfitSubtitle")}</p>
        </div>
        <Button className="h-10" onClick={() => setOpen(true)}>
          {t("newOutfit")}
        </Button>
      </div>
      {outfits.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <h2 className="text-lg font-medium">{t("emptyOutfits")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("emptyOutfitsHint")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {outfits.map((outfit) => (
            <li key={outfit.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{outfit.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {outfit.occasion ? occasionLabel(locale, outfit.occasion) : t("none")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void wear(outfit)}>
                    {t("wearToday")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(outfit)}>
                    {t("deleteItem")}
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {outfit.items.map((item) => (
                  <div key={item.id} className="w-20 shrink-0">
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-[#ece7df] dark:bg-[#2a2723]">
                      <ItemVisual item={item} />
                    </div>
                    <div className="mt-1 truncate text-[11px] text-muted-foreground">{item.name}</div>
                  </div>
                ))}
              </div>
              {outfit.tip ? <p className="mt-3 text-sm text-muted-foreground">{outfit.tip}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100vh-1.5rem)] overflow-y-auto sm:max-w-2xl!">
          <DialogHeader>
            <DialogTitle>{t("newOutfit")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="outfit-name">{t("outfitName")}</Label>
              <Input id="outfit-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t("occasion")}</Label>
              <Select value={occasion} onValueChange={(value) => value && setOccasion(value)} items={occasionItems}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {occasionItems.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="outfit-notes">{t("notes")}</Label>
              <Textarea id="outfit-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">{t("pickItems")}</div>
              <div className="space-y-3">
                {grouped.map((group) => (
                  <div key={group.category}>
                    <div className="mb-1 text-xs text-muted-foreground">{categoryLabel(locale, group.category)}</div>
                    <div className="flex gap-2 overflow-x-auto">
                      {group.items.map((item) => {
                        const active = picked.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPicked((current) => (active ? current.filter((id) => id !== item.id) : [...current, item.id]))}
                            className={cn("w-20 shrink-0 rounded-lg border p-1 text-left", active && "border-foreground")}
                          >
                            <div className="aspect-[3/4] overflow-hidden rounded-md bg-[#ece7df]">
                              <ItemVisual item={item} />
                            </div>
                            <div className="mt-1 truncate text-[11px]">{item.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
              <Button disabled={pending} onClick={() => void save()}>
                {pending ? t("saving") : t("saveOutfit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

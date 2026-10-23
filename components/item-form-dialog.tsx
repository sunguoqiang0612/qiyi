"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { CATEGORIES, COLORS, SEASONS, categoryLabel, colorHex, colorLabel, seasonLabel } from "@/lib/constants";
import type { ItemDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ItemFormDialog({
  open,
  mode,
  item,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  item?: ItemDTO | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (result: { item: ItemDTO; tagged: boolean }) => void;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("top");
  const [colors, setColors] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>(["all"]);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [autoTag, setAutoTag] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategory(item?.category || "top");
    setColors(item?.colors ?? []);
    setSeasons(item?.seasons?.length ? item.seasons : ["all"]);
    setTags(item?.tags.join("，") ?? "");
    setNotes(item?.notes ?? "");
    setAutoTag(mode === "create");
    setFile(null);
    setPreview(item?.imageUrl ?? null);
  }, [open, item, mode]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((itemId) => itemId !== value) : [...list, value]);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const form = new FormData();
    form.set("name", name);
    form.set("category", category);
    form.set("colors", JSON.stringify(colors));
    form.set("seasons", JSON.stringify(seasons));
    form.set("tags", tags);
    form.set("notes", notes);
    form.set("autoTag", autoTag ? "1" : "0");
    if (file) form.set("file", file);
    try {
      const result = await api<{ item: ItemDTO; tagged: boolean }>(mode === "create" ? "/api/items" : `/api/items/${item?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body: form,
      });
      toast.success(result.tagged ? t("aiApplied") : mode === "create" ? t("itemSaved") : t("itemUpdated"));
      if (autoTag && !result.tagged) toast.message(t("aiSkipped"));
      onSaved(result);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  const categoryItems = CATEGORIES.map((id) => ({ value: id, label: categoryLabel(locale, id) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-1.5rem)] overflow-y-auto sm:max-w-xl!">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("addItem") : t("edit")}</DialogTitle>
          <DialogDescription>{t("autoTagHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <label className="grid cursor-pointer gap-2">
            <span className="text-sm font-medium">{file || preview ? t("changePhoto") : t("uploadPhoto")}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-sm"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                if (next && next.size > 8 * 1024 * 1024) {
                  toast.error("图片请小于 8MB");
                  return;
                }
                setFile(next);
              }}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-40 w-full rounded-xl object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">{t("photoOptional")}</span>
            )}
          </label>
          <div className="grid gap-1.5">
            <Label htmlFor="item-name">{t("displayName")}</Label>
            <Input id="item-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("namePlaceholder")} maxLength={80} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("category")}</Label>
            <Select value={category} onValueChange={(value) => value && setCategory(value)} items={categoryItems}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ChipGroup label={t("colors")}>
            {COLORS.map((color) => (
              <Chip key={color.id} active={colors.includes(color.id)} onClick={() => toggle(colors, color.id, setColors)}>
                <span className="size-2.5 rounded-full border" style={{ background: colorHex(color.id) }} />
                {colorLabel(locale, color.id)}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup label={t("seasons")}>
            {SEASONS.map((season) => (
              <Chip key={season} active={seasons.includes(season)} onClick={() => toggle(seasons, season, setSeasons)}>
                {seasonLabel(locale, season)}
              </Chip>
            ))}
          </ChipGroup>
          <div className="grid gap-1.5">
            <Label htmlFor="tags">{t("tags")}</Label>
            <Input id="tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t("tagsPlaceholder")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("notesPlaceholder")} rows={3} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={autoTag} onCheckedChange={(checked) => setAutoTag(Boolean(checked))} className="mt-0.5" />
            <span>
              <span className="font-medium">{t("autoTag")}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t("autoTagHint")}</span>
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        active ? "border-foreground bg-foreground text-background" : "bg-card text-foreground",
      )}
    >
      {children}
    </button>
  );
}

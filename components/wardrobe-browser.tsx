"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/client";
import { CATEGORIES, categoryLabel, washLabel } from "@/lib/constants";
import type { ItemDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { ItemDetailDialog } from "@/components/item-detail-dialog";
import { ItemFormDialog } from "@/components/item-form-dialog";
import { ItemVisual } from "@/components/item-visual";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type WardrobeData = {
  items: ItemDTO[];
  total: number;
  page: number;
  pages: number;
  q: string;
  category: string;
  sort: string;
};

const sorts = [
  { id: "newest", key: "sortNewest" },
  { id: "oldest", key: "sortOldest" },
  { id: "most_worn", key: "sortMostWorn" },
  { id: "least_worn", key: "sortLeastWorn" },
  { id: "name", key: "sortName" },
] as const;

export function WardrobeBrowser({ data }: { data: WardrobeData }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<ItemDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ItemDTO | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [patches, setPatches] = useState<Record<string, ItemDTO>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [query, setQuery] = useState(data.q);

  const items = useMemo(
    () => data.items.filter((item) => !removed.includes(item.id)).map((item) => patches[item.id] ?? item),
    [data.items, patches, removed],
  );

  function push(changes: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (resetPage) params.delete("page");
    const next = params.toString();
    router.push(next ? `/wardrobe?${next}` : "/wardrobe");
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function removeSelected() {
    if (!selected.length) return;
    if (!window.confirm(t("confirmDeleteItems", { n: selected.length }))) return;
    try {
      await api("/api/items/bulk-delete", { method: "POST", body: JSON.stringify({ ids: selected }) });
      toast.success(t("deleted"));
      setSelected([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    }
  }

  const allChecked = items.length > 0 && items.every((item) => selected.includes(item.id));
  const sortItems = sorts.map((sort) => ({ value: sort.id, label: t(sort.key) }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("navWardrobe")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pieceCount", { n: data.total })}</p>
        </div>
        <Button className="h-10" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus />
          {t("addItem")}
        </Button>
      </div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            push({ q: query.trim() || null });
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="pl-8" />
          </div>
          <Button type="submit" variant="outline">
            {t("search")}
          </Button>
        </form>
        <Select value={data.sort || "newest"} onValueChange={(value) => value && push({ sort: value === "newest" ? null : value })} items={sortItems}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortItems.map((sort) => (
              <SelectItem key={sort.value} value={sort.value}>
                {sort.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={!data.category} onClick={() => push({ category: null })}>
          {t("allCategories")}
        </FilterChip>
        {CATEGORIES.map((category) => (
          <FilterChip key={category} active={data.category === category} onClick={() => push({ category: data.category === category ? null : category })}>
            {categoryLabel(locale, category)}
          </FilterChip>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <h2 className="text-lg font-medium">{t("emptyWardrobe")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("emptyWardrobeHint")}</p>
          <Button className="mt-4" onClick={() => { setEditing(null); setFormOpen(true); }}>
            {t("addItem")}
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <li key={item.id} className="group relative overflow-hidden rounded-2xl border bg-card">
              <button type="button" className="block w-full text-left" onClick={() => setActive(item)}>
                <div className="aspect-[3/4] bg-[#ece7df] dark:bg-[#2a2723]">
                  <ItemVisual item={item} />
                </div>
                <div className="space-y-0.5 px-3 py-2.5">
                  <div className="truncate text-sm font-medium">{item.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{categoryLabel(locale, item.category)}</div>
                </div>
              </button>
              {item.washStatus !== "clean" ? (
                <span className="absolute top-2 right-2 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] text-white">
                  {washLabel(locale, item.washStatus)}
                </span>
              ) : null}
              <label className="absolute top-2 left-2 grid size-7 place-items-center rounded-md bg-white/85 opacity-0 shadow-sm group-hover:opacity-100 has-data-checked:opacity-100 dark:bg-black/50">
                <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggle(item.id)} aria-label={item.name} />
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={allChecked}
            onCheckedChange={() => setSelected(allChecked ? [] : items.map((item) => item.id))}
          />
          {t("selectAll")}
          <span className="text-muted-foreground">{selected.length ? t("selectedN", { n: selected.length }) : t("noneSelected")}</span>
        </label>
        <div className="flex items-center gap-2">
          {selected.length ? (
            <Button size="sm" variant="destructive" onClick={() => void removeSelected()}>
              {t("deleteSelected")}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => push({ page: String(data.page - 1) }, false)}>
            ‹
          </Button>
          <span className="text-sm text-muted-foreground">
            {data.page} / {data.pages}
          </span>
          <Button size="sm" variant="outline" disabled={data.page >= data.pages} onClick={() => push({ page: String(data.page + 1) }, false)}>
            ›
          </Button>
        </div>
      </div>
      <ItemDetailDialog
        item={active}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        onEdit={(next) => {
          setEditing(next);
          setFormOpen(true);
        }}
        onChanged={(next) => {
          setPatches((current) => ({ ...current, [next.id]: next }));
          setActive(next);
        }}
        onDeleted={(id) => {
          setRemoved((current) => [...current, id]);
          setActive(null);
          router.refresh();
        }}
      />
      <ItemFormDialog
        open={formOpen}
        mode={editing ? "edit" : "create"}
        item={editing}
        onOpenChange={setFormOpen}
        onSaved={() => {
          setRemoved([]);
          setPatches({});
          router.refresh();
        }}
      />
    </div>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-sm",
        active ? "border-foreground bg-foreground text-background" : "bg-card",
      )}
    >
      {children}
    </button>
  );
}

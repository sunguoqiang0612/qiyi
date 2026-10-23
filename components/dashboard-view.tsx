import Link from "next/link";
import { categoryLabel } from "@/lib/constants";
import { displayDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import type { ItemDTO } from "@/lib/types";
import { ItemVisual } from "@/components/item-visual";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardView({
  locale,
  name,
  itemCount,
  cleanCount,
  needsWash,
  outfitsSaved,
  generated,
  recent,
}: {
  locale: string;
  name: string;
  itemCount: number;
  cleanCount: number;
  needsWash: ItemDTO[];
  outfitsSaved: number;
  generated: number;
  recent: { groupId: string; wornOn: string; title: string }[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t(locale, "dashTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {name} · {t(locale, "pieceCount", { n: itemCount })} · {t(locale, "cleanCount", { n: cleanCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/wardrobe" className={buttonVariants({ variant: "outline" })}>
            {t(locale, "dashWardrobe")}
          </Link>
          <Link href="/suggest" className={cn(buttonVariants())}>{t(locale, "dashSuggest")}</Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Mini label={t(locale, "totalItems")} value={String(itemCount)} />
        <Mini label={t(locale, "outfitTitle")} value={String(outfitsSaved)} />
        <Mini label={t(locale, "outfitsGenerated")} value={String(generated)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">{t(locale, "dashNeedsWash")}</h2>
            <Link href="/wardrobe" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              {t(locale, "viewAll")}
            </Link>
          </div>
          {needsWash.length === 0 ? <p className="text-sm text-muted-foreground">{t(locale, "dashNoWash")}</p> : null}
          <ul className="space-y-2">
            {needsWash.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="size-12 overflow-hidden rounded-lg bg-[#ece7df]">
                  <ItemVisual item={item} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{categoryLabel(locale, item.category)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">{t(locale, "dashRecent")}</h2>
            <Link href="/history" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              {t(locale, "viewAll")}
            </Link>
          </div>
          {recent.length === 0 ? <p className="text-sm text-muted-foreground">{t(locale, "dashNoRecent")}</p> : null}
          <ul className="space-y-2">
            {recent.map((entry) => (
              <li key={entry.groupId} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{entry.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{displayDate(entry.wornOn, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

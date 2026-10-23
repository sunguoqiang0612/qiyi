import Link from "next/link";
import { categoryLabel, colorHex, colorLabel } from "@/lib/constants";
import { displayDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import type { AnalyticsDTO } from "@/lib/types";
import { ItemVisual } from "@/components/item-visual";

export function AnalyticsView({ data, locale }: { data: AnalyticsDTO; locale: string }) {
  const maxType = Math.max(1, ...data.categories.map((category) => category.count));
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t(locale, "analyticsTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(locale, "analyticsSubtitle")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t(locale, "totalItems")} value={String(data.itemCount)} hint={t(locale, "readyToWear", { n: data.readyCount })} />
        <Stat label={t(locale, "outfitsGenerated")} value={String(data.generated)} hint={t(locale, "generatedHint")} />
        <Stat
          label={t(locale, "acceptance")}
          value={data.acceptance == null ? "—" : `${data.acceptance}%`}
          hint={data.acceptance == null ? t(locale, "noVotes") : t(locale, "voteHint", { loved: data.loved, disliked: data.disliked })}
        />
        <Stat label={t(locale, "totalWears")} value={String(data.totalWears)} hint={t(locale, "trackHint")} />
      </div>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t(locale, "insights")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {data.insights.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="font-medium">{t(locale, "colorDist")}</h2>
          <p className="text-xs text-muted-foreground">{t(locale, "colorHint")}</p>
          <div className="mt-4 space-y-3">
            {data.colors.length === 0 ? <p className="text-sm text-muted-foreground">{t(locale, "noVotes")}</p> : null}
            {data.colors.map((color) => (
              <div key={color.id} className="grid grid-cols-[92px_1fr_48px] items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-sm border" style={{ background: color.id === "unknown" ? "#d6d3d1" : colorHex(color.id) }} />
                  <span className="truncate">{color.id === "unknown" ? t(locale, "noColor") : colorLabel(locale, color.id)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${color.pct}%` }} />
                </div>
                <div className="text-right text-muted-foreground">{color.pct}%</div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="font-medium">{t(locale, "itemTypes")}</h2>
          <p className="text-xs text-muted-foreground">{t(locale, "typeHint")}</p>
          <div className="mt-4 space-y-3">
            {data.categories.map((category) => (
              <div key={category.id} className="grid grid-cols-[92px_1fr_32px] items-center gap-3 text-sm">
                <span>{categoryLabel(locale, category.id)}</span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${(category.count / maxType) * 100}%` }} />
                </div>
                <span className="text-right text-muted-foreground">{category.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <WearColumn title={t(locale, "mostWorn")} hint={t(locale, "favorites")} items={data.mostWorn} empty={t(locale, "startTracking")} locale={locale} />
        <WearColumn title={t(locale, "leastWorn")} hint={t(locale, "consider")} items={data.leastWorn} empty={t(locale, "keepTracking")} locale={locale} />
        <WearColumn title={t(locale, "neverWorn")} hint={t(locale, "timeToTry")} items={data.neverWorn} empty={t(locale, "insightGood")} locale={locale} zero />
      </div>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-medium">{t(locale, "acceptanceTrend")}</h2>
        <p className="text-xs text-muted-foreground">{t(locale, "howResponded")}</p>
        <div className="mt-4 flex h-32 items-end gap-2">
          {data.trend.map((point) => (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 w-full items-end rounded-md bg-muted">
                <div className="w-full rounded-md bg-foreground/80" style={{ height: `${point.total ? Math.max(point.rate, 8) : 0}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{point.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-right text-sm text-muted-foreground">{data.acceptance == null ? "0%" : `${data.acceptance}%`}</div>
      </section>
      <p className="text-sm">
        <Link href="/suggest" className="underline-offset-4 hover:underline">
          {t(locale, "dashSuggest")}
        </Link>
      </p>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function WearColumn({
  title,
  hint,
  items,
  empty,
  locale,
  zero = false,
}: {
  title: string;
  hint: string;
  items: AnalyticsDTO["mostWorn"];
  empty: string;
  locale: string;
  zero?: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="font-medium">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{empty}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <div className="size-12 overflow-hidden rounded-lg bg-[#ece7df] dark:bg-[#2a2723]">
              <ItemVisual item={item} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">
                {categoryLabel(locale, item.category)} · {displayDate(item.lastWornAt, locale)}
              </div>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{zero ? "0×" : `${item.wearCount}×`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

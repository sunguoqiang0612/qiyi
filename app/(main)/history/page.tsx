import { redirect } from "next/navigation";
import { HistoryPanel } from "@/components/history-panel";
import { getSessionUser } from "@/lib/auth";
import { shanghaiToday } from "@/lib/dates";
import { getHistory } from "@/lib/wardrobe-actions";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const monthValue = params.month;
  const month = (Array.isArray(monthValue) ? monthValue[0] : monthValue) || shanghaiToday().slice(0, 7);
  const data = await getHistory(user.id, user.activeProfileId!, month);
  return (
    <HistoryPanel
      month={data.month}
      groups={data.groups}
      days={data.days}
      items={data.choices.items}
      outfits={data.choices.outfits}
    />
  );
}

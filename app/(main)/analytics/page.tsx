import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/analytics-view";
import { getSessionUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getAnalytics(user);
  return <AnalyticsView data={data} locale={user.locale} />;
}

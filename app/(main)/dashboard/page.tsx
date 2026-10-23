import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";
import { getSessionUser } from "@/lib/auth";
import { getDashboard } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getDashboard(user);
  const profile = user.profiles.find((item) => item.id === user.activeProfileId);
  return (
    <DashboardView
      locale={user.locale}
      name={profile?.name || user.name}
      itemCount={data.itemCount}
      cleanCount={data.cleanCount}
      needsWash={data.needsWash}
      outfitsSaved={data.outfitsSaved}
      generated={data.generated}
      recent={data.recent}
    />
  );
}

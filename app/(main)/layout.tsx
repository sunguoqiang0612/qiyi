import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ShellUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
  const shellUser: ShellUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    locale: user.locale,
    theme: user.theme,
    activeProfileId: user.activeProfileId ?? user.profiles[0].id,
    profiles: user.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      relation: profile.relation,
    })),
  };
  return (
    <AppShell user={shellUser} unread={unread}>
      {children}
    </AppShell>
  );
}

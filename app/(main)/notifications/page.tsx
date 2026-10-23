import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notification-list";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <NotificationList
      initial={rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      }))}
    />
  );
}

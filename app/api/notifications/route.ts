import { requireApiUser } from "@/lib/auth";
import { handle, ok, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { remindUser } from "@/lib/remind";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({
      notifications: rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        read: row.read,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const body = await readJson(request);
    if (body.all === true) {
      await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
      return ok({ ok: true });
    }
    if (body.remind === true) {
      const notification = await remindUser(user.id, true);
      return ok({ notification });
    }
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
    if (ids.length) {
      await prisma.notification.updateMany({
        where: { userId: user.id, id: { in: ids } },
        data: { read: true },
      });
    }
    return ok({ ok: true });
  });
}

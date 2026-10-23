import { requireApiUser } from "@/lib/auth";
import { toItemDTO } from "@/lib/dto";
import { ApiError, handle, ok } from "@/lib/http";
import { itemDetail } from "@/lib/items";
import { updateItemFromForm } from "@/lib/item-mutate";
import { prisma } from "@/lib/prisma";
import { removeUpload } from "@/lib/uploads";
import { formatDateOnly } from "@/lib/dates";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const detail = await itemDetail(user.id, id, user.washThreshold);
    if (!detail) throw new ApiError(404, "找不到这件衣服");
    return ok({
      item: toItemDTO(detail.item),
      months: detail.months,
      avgPerMonth: detail.avgPerMonth,
      recentWears: detail.recentWears.map((wear) => ({
        wornOn: formatDateOnly(wear.wornOn),
        note: wear.note,
      })),
      threshold: detail.threshold,
    });
  });
}

export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const form = await request.formData();
    const result = await updateItemFromForm({
      userId: user.id,
      itemId: id,
      locale: user.locale,
      aiUser: user,
      form,
    });
    return ok(result);
  });
}

export async function DELETE(_request: Request, context: Context) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await context.params;
    const item = await prisma.item.findFirst({ where: { id, userId: user.id } });
    if (!item) throw new ApiError(404, "找不到这件衣服");
    await prisma.item.delete({ where: { id } });
    await removeUpload(item.imagePath);
    return ok({ ok: true });
  });
}

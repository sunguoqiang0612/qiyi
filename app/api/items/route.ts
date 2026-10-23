import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { createItemFromForm } from "@/lib/item-mutate";
import { listItems } from "@/lib/items";

export async function GET(request: Request) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const url = new URL(request.url);
    const data = await listItems(user, {
      q: url.searchParams.get("q") ?? "",
      category: url.searchParams.get("category") ?? "",
      sort: url.searchParams.get("sort") ?? "",
      page: url.searchParams.get("page") ?? "",
    });
    return ok(data);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const { user, profile } = await requireApiUser();
    const form = await request.formData();
    const result = await createItemFromForm({
      userId: user.id,
      profileId: profile.id,
      locale: user.locale,
      aiUser: user,
      form,
    });
    return ok(result, 201);
  });
}

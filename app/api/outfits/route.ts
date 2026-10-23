import { requireApiUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { createOutfit, listOutfits } from "@/lib/wardrobe-actions";
import { readJson } from "@/lib/http";

export async function GET() {
  return handle(async () => {
    const { user, profile } = await requireApiUser();
    return ok({ outfits: await listOutfits(user.id, profile.id) });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const { user, profile } = await requireApiUser();
    const body = await readJson(request);
    const itemIds = Array.isArray(body.itemIds) ? body.itemIds.filter((id): id is string => typeof id === "string") : [];
    const outfit = await createOutfit({
      userId: user.id,
      profileId: profile.id,
      name: String(body.name ?? ""),
      occasion: typeof body.occasion === "string" ? body.occasion : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      tip: typeof body.tip === "string" ? body.tip : null,
      itemIds,
    });
    return ok({ outfit }, 201);
  });
}

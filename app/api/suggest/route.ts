import { requireApiUser } from "@/lib/auth";
import { handle, ok, readJson } from "@/lib/http";
import { createSuggestion } from "@/lib/remind";

export async function POST(request: Request) {
  return handle(async () => {
    const { user, profile } = await requireApiUser();
    const body = await readJson(request);
    const exclude = Array.isArray(body.exclude) ? body.exclude.filter((id): id is string => typeof id === "string") : [];
    const result = await createSuggestion({
      user,
      profileId: profile.id,
      occasion: String(body.occasion ?? "casual"),
      exclude,
    });
    return ok(result);
  });
}

import fs from "fs/promises";
import { getSessionUser } from "@/lib/auth";
import { absoluteUpload, mimeFor } from "@/lib/uploads";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { path: parts } = await context.params;
  if (parts[0] !== user.id) return new Response("forbidden", { status: 403 });
  const relative = parts.map(decodeURIComponent).join("/");
  const full = absoluteUpload(relative);
  if (!full) return new Response("bad path", { status: 400 });
  try {
    const file = await fs.readFile(full);
    return new Response(file, {
      headers: {
        "Content-Type": mimeFor(full),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}

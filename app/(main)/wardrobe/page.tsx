import { redirect } from "next/navigation";
import { WardrobeBrowser } from "@/components/wardrobe-browser";
import { getSessionUser } from "@/lib/auth";
import { listItems } from "@/lib/items";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function WardrobePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const data = await listItems(user, {
    q: one(params.q),
    category: one(params.category),
    sort: one(params.sort),
    page: one(params.page),
  });
  return <WardrobeBrowser data={data} />;
}

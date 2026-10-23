import { redirect } from "next/navigation";
import { OutfitManager } from "@/components/outfit-manager";
import { getSessionUser } from "@/lib/auth";
import { toItemDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";
import { listOutfits } from "@/lib/wardrobe-actions";

export const dynamic = "force-dynamic";

export default async function OutfitsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const profileId = user.activeProfileId!;
  const [outfits, items] = await Promise.all([
    listOutfits(user.id, profileId),
    prisma.item.findMany({ where: { userId: user.id, profileId }, orderBy: { name: "asc" } }),
  ]);
  return <OutfitManager outfits={outfits} items={items.map(toItemDTO)} />;
}

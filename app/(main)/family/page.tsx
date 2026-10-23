import { redirect } from "next/navigation";
import { FamilyManager } from "@/components/family-manager";
import { getSessionUser } from "@/lib/auth";
import { toProfileDTO } from "@/lib/dto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const profiles = await prisma.profile.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "asc" },
  });
  return <FamilyManager profiles={profiles.map((profile) => toProfileDTO(profile, user.activeProfileId))} />;
}

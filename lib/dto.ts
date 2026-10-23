import type { Item, Outfit, OutfitItem, Profile } from "@prisma/client";
import { mediaUrl, asStringArray } from "@/lib/json";
import type { ItemDTO, OutfitDTO, ProfileDTO } from "@/lib/types";
import { formatDateOnly } from "@/lib/dates";

type ItemRow = Item;

export function toItemDTO(item: ItemRow): ItemDTO {
  return {
    id: item.id,
    profileId: item.profileId,
    name: item.name,
    category: item.category,
    colors: asStringArray(item.colors),
    seasons: asStringArray(item.seasons),
    tags: asStringArray(item.tags),
    notes: item.notes ?? "",
    imageUrl: mediaUrl(item.imagePath),
    washStatus: item.washStatus,
    wearsSinceWash: item.wearsSinceWash,
    wearCount: item.wearCount,
    lastWornAt: formatDateOnly(item.lastWornAt),
    favorite: item.favorite,
    aiSummary: item.aiSummary,
    aiConfidence: item.aiConfidence,
    createdAt: item.createdAt.toISOString(),
  };
}

export function toOutfitDTO(
  outfit: Outfit & { items: (OutfitItem & { item: Item })[] },
): OutfitDTO {
  return {
    id: outfit.id,
    name: outfit.name,
    occasion: outfit.occasion,
    notes: outfit.notes ?? "",
    tip: outfit.tip ?? "",
    createdAt: outfit.createdAt.toISOString(),
    items: outfit.items.map((entry) => ({
      ...toItemDTO(entry.item),
      slot: entry.slot,
    })),
  };
}

export function toProfileDTO(profile: Profile & { _count?: { items: number } }, activeId: string | null): ProfileDTO {
  return {
    id: profile.id,
    name: profile.name,
    relation: profile.relation,
    itemCount: profile._count?.items ?? 0,
    active: profile.id === activeId,
  };
}

export function maskKey(value: string) {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}

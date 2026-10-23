import { GarmentArt } from "@/components/garment-art";
import type { ItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ItemVisual({
  item,
  className,
}: {
  item: Pick<ItemDTO, "name" | "category" | "colors" | "imageUrl">;
  className?: string;
}) {
  if (item.imageUrl) {
    return (
      // Local uploads are served by our own route, not the image optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.imageUrl} alt={item.name} className={cn("h-full w-full object-cover", className)} />
    );
  }
  return <GarmentArt category={item.category} color={item.colors[0]} className={cn("h-full w-full", className)} />;
}

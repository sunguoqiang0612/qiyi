import Link from "next/link";
import { cookies } from "next/headers";
import { t } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const locale = (await cookies()).get("qiyi_locale")?.value;
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">{t(locale ?? "zh", "notFound")}</h1>
        <Link href="/wardrobe" className={cn(buttonVariants(), "mt-4")}>
          {t(locale ?? "zh", "backHome")}
        </Link>
      </div>
    </div>
  );
}

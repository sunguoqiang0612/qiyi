"use client";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

export default function MainError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{t("errorTitle")}</h1>
      <Button className="mt-4" onClick={() => reset()}>
        {t("retry")}
      </Button>
    </div>
  );
}

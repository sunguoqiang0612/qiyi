"use client";

import { createContext, useContext, useMemo } from "react";
import { asLocale, type Locale } from "@/lib/constants";
import { t, type MessageKey } from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue>({
  locale: "zh",
  t: (key, vars) => t("zh", key, vars),
});

export function I18nProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const current = asLocale(locale);
    return {
      locale: current,
      t: (key, vars) => t(current, key, vars),
    };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

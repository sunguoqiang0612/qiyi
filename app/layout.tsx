import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/components/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "栖衣",
  description: "自托管衣橱：记录衣服、穿着和清洗，按天气搭配。",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const locale = jar.get("qiyi_locale")?.value === "en" ? "en" : "zh";
  const theme = jar.get("qiyi_theme")?.value;
  const defaultTheme = theme === "dark" || theme === "system" ? theme : "light";

  return (
    <html lang={locale === "en" ? "en" : "zh-CN"} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
          <I18nProvider locale={locale}>
            {children}
            <Toaster position="top-center" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

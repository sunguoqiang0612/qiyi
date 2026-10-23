import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";
import { getSessionUser } from "@/lib/auth";
import { maskKey } from "@/lib/dto";
import type { SettingsDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const initial: SettingsDTO = {
    name: user.name,
    email: user.email,
    locale: user.locale,
    theme: user.theme,
    city: user.city ?? "",
    latitude: user.latitude,
    longitude: user.longitude,
    washThreshold: user.washThreshold,
    aiBaseUrl: user.aiBaseUrl ?? "",
    aiVisionModel: user.aiVisionModel ?? "",
    aiTextModel: user.aiTextModel ?? "",
    aiApiKeySet: Boolean(user.aiApiKey),
    aiApiKeyMask: user.aiApiKey ? maskKey(user.aiApiKey) : "",
    ntfyUrl: user.ntfyUrl ?? "",
    emailNotify: user.emailNotify,
    envAi: {
      base: Boolean(process.env.AI_BASE_URL),
      key: Boolean(process.env.AI_API_KEY),
      vision: Boolean(process.env.AI_VISION_MODEL),
      text: Boolean(process.env.AI_TEXT_MODEL || process.env.AI_VISION_MODEL),
    },
  };
  return <SettingsForm initial={initial} />;
}

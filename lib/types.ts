export type ItemDTO = {
  id: string;
  profileId: string;
  name: string;
  category: string;
  colors: string[];
  seasons: string[];
  tags: string[];
  notes: string;
  imageUrl: string | null;
  washStatus: string;
  wearsSinceWash: number;
  wearCount: number;
  lastWornAt: string | null;
  favorite: boolean;
  aiSummary: string | null;
  aiConfidence: number | null;
  createdAt: string;
};

export type ItemDetailDTO = {
  item: ItemDTO;
  months: { key: string; label: string; count: number }[];
  avgPerMonth: number;
  recentWears: { wornOn: string; note: string }[];
  threshold: number;
};

export type OutfitDTO = {
  id: string;
  name: string;
  occasion: string | null;
  notes: string;
  tip: string;
  createdAt: string;
  items: (ItemDTO & { slot: string })[];
};

export type ProfileDTO = {
  id: string;
  name: string;
  relation: string;
  itemCount: number;
  active: boolean;
};

export type SuggestionDTO = {
  id: string;
  name: string;
  occasion: string;
  reasons: string[];
  tip: string;
  items: ItemDTO[];
  missing: string[];
  repeated: boolean;
  verdict: string | null;
  signature: string;
  weather: WeatherDTO | null;
};

export type WeatherDTO = {
  temperature: number;
  apparent: number;
  precipProb: number;
  code: number;
  wind: number;
  labelZh: string;
  labelEn: string;
};

export type WearGroupDTO = {
  groupId: string;
  wornOn: string;
  note: string;
  outfitName: string | null;
  items: { id: string | null; name: string; category: string; imageUrl: string | null }[];
};

export type AnalyticsDTO = {
  itemCount: number;
  readyCount: number;
  outfitsSaved: number;
  generated: number;
  acceptance: number | null;
  loved: number;
  disliked: number;
  totalWears: number;
  wearsThisWeek: number;
  insights: string[];
  colors: { id: string; count: number; pct: number }[];
  categories: { id: string; count: number }[];
  mostWorn: ItemDTO[];
  leastWorn: ItemDTO[];
  neverWorn: ItemDTO[];
  trend: { label: string; rate: number; total: number }[];
};

export type ShellUser = {
  id: string;
  email: string;
  name: string;
  locale: string;
  theme: string;
  activeProfileId: string;
  profiles: { id: string; name: string; relation: string }[];
};

export type SettingsDTO = {
  name: string;
  email: string;
  locale: string;
  theme: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  washThreshold: number;
  aiBaseUrl: string;
  aiVisionModel: string;
  aiTextModel: string;
  aiApiKeySet: boolean;
  aiApiKeyMask: string;
  ntfyUrl: string;
  emailNotify: boolean;
  envAi: { base: boolean; key: boolean; vision: boolean; text: boolean };
};

export type NotificationDTO = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "bag",
  "accessory",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const COLORS = [
  { id: "black", hex: "#1c1c1c" },
  { id: "white", hex: "#f4f4f2" },
  { id: "gray", hex: "#9aa0a6" },
  { id: "navy", hex: "#1e3a5f" },
  { id: "blue", hex: "#3b6ea5" },
  { id: "brown", hex: "#8a5a3c" },
  { id: "beige", hex: "#e4d3b8" },
  { id: "cream", hex: "#f3ead7" },
  { id: "green", hex: "#3f6b4a" },
  { id: "khaki", hex: "#c2b280" },
  { id: "red", hex: "#a33b3b" },
  { id: "pink", hex: "#e4a8b5" },
  { id: "yellow", hex: "#e3c15a" },
  { id: "orange", hex: "#d9783a" },
  { id: "purple", hex: "#6d5b8c" },
] as const;

export type ColorId = (typeof COLORS)[number]["id"];

export const SEASONS = ["spring", "summer", "autumn", "winter", "all"] as const;
export type Season = (typeof SEASONS)[number];

export const OCCASIONS = [
  "casual",
  "work",
  "date",
  "sport",
  "formal",
  "home",
  "travel",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const RELATIONS = ["self", "partner", "child", "parent", "other"] as const;
export type Relation = (typeof RELATIONS)[number];

export const WASH_STATUSES = ["clean", "needs_wash", "washing"] as const;
export type WashStatus = (typeof WASH_STATUSES)[number];

export const CITIES = [
  { id: "beijing", zh: "北京", en: "Beijing", lat: 39.9042, lon: 116.4074 },
  { id: "shanghai", zh: "上海", en: "Shanghai", lat: 31.2304, lon: 121.4737 },
  { id: "guangzhou", zh: "广州", en: "Guangzhou", lat: 23.1291, lon: 113.2644 },
  { id: "shenzhen", zh: "深圳", en: "Shenzhen", lat: 22.5431, lon: 114.0579 },
  { id: "chengdu", zh: "成都", en: "Chengdu", lat: 30.5728, lon: 104.0668 },
  { id: "hangzhou", zh: "杭州", en: "Hangzhou", lat: 30.2741, lon: 120.1551 },
  { id: "wuhan", zh: "武汉", en: "Wuhan", lat: 30.5928, lon: 114.3055 },
  { id: "xian", zh: "西安", en: "Xi'an", lat: 34.3416, lon: 108.9398 },
  { id: "nanjing", zh: "南京", en: "Nanjing", lat: 32.0603, lon: 118.7969 },
  { id: "chongqing", zh: "重庆", en: "Chongqing", lat: 29.563, lon: 106.5516 },
] as const;

export const NEUTRAL_COLORS = new Set<string>([
  "black",
  "white",
  "gray",
  "navy",
  "beige",
  "cream",
  "khaki",
  "brown",
]);

export const PAGE_SIZE = 12;

export type Locale = "zh" | "en";

export function asLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "zh";
}

const categoryLabels: Record<Locale, Record<Category, string>> = {
  zh: {
    top: "上装",
    bottom: "下装",
    dress: "裙装",
    outerwear: "外套",
    shoes: "鞋履",
    bag: "包袋",
    accessory: "配饰",
    other: "其他",
  },
  en: {
    top: "Tops",
    bottom: "Bottoms",
    dress: "Dresses",
    outerwear: "Outerwear",
    shoes: "Shoes",
    bag: "Bags",
    accessory: "Accessories",
    other: "Other",
  },
};

const colorLabels: Record<Locale, Record<ColorId, string>> = {
  zh: {
    black: "黑色",
    white: "白色",
    gray: "灰色",
    navy: "藏青",
    blue: "蓝色",
    brown: "棕色",
    beige: "米色",
    cream: "奶白",
    green: "绿色",
    khaki: "卡其",
    red: "红色",
    pink: "粉色",
    yellow: "黄色",
    orange: "橙色",
    purple: "紫色",
  },
  en: {
    black: "Black",
    white: "White",
    gray: "Gray",
    navy: "Navy",
    blue: "Blue",
    brown: "Brown",
    beige: "Beige",
    cream: "Cream",
    green: "Green",
    khaki: "Khaki",
    red: "Red",
    pink: "Pink",
    yellow: "Yellow",
    orange: "Orange",
    purple: "Purple",
  },
};

const seasonLabels: Record<Locale, Record<Season, string>> = {
  zh: { spring: "春", summer: "夏", autumn: "秋", winter: "冬", all: "四季" },
  en: {
    spring: "Spring",
    summer: "Summer",
    autumn: "Autumn",
    winter: "Winter",
    all: "All year",
  },
};

const occasionLabels: Record<Locale, Record<Occasion, string>> = {
  zh: {
    casual: "日常",
    work: "通勤",
    date: "约会",
    sport: "运动",
    formal: "正式",
    home: "居家",
    travel: "出行",
  },
  en: {
    casual: "Casual",
    work: "Work",
    date: "Date",
    sport: "Sport",
    formal: "Formal",
    home: "Home",
    travel: "Travel",
  },
};

const relationLabels: Record<Locale, Record<Relation, string>> = {
  zh: { self: "自己", partner: "伴侣", child: "孩子", parent: "长辈", other: "其他" },
  en: { self: "Self", partner: "Partner", child: "Child", parent: "Parent", other: "Other" },
};

const washLabels: Record<Locale, Record<WashStatus, string>> = {
  zh: { clean: "干净", needs_wash: "该洗了", washing: "洗涤中" },
  en: { clean: "Clean", needs_wash: "Needs washing", washing: "In the wash" },
};

export function categoryLabel(locale: string, id: string) {
  const table = categoryLabels[asLocale(locale)];
  return table[id as Category] ?? id;
}

export function colorLabel(locale: string, id: string) {
  const table = colorLabels[asLocale(locale)];
  return table[id as ColorId] ?? id;
}

export function seasonLabel(locale: string, id: string) {
  const table = seasonLabels[asLocale(locale)];
  return table[id as Season] ?? id;
}

export function occasionLabel(locale: string, id: string) {
  const table = occasionLabels[asLocale(locale)];
  return table[id as Occasion] ?? id;
}

export function relationLabel(locale: string, id: string) {
  const table = relationLabels[asLocale(locale)];
  return table[id as Relation] ?? id;
}

export function washLabel(locale: string, id: string) {
  const table = washLabels[asLocale(locale)];
  return table[id as WashStatus] ?? id;
}

export function colorHex(id: string) {
  return COLORS.find((color) => color.id === id)?.hex ?? "#c8c2b8";
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isOccasion(value: string): value is Occasion {
  return (OCCASIONS as readonly string[]).includes(value);
}

export function isRelation(value: string): value is Relation {
  return (RELATIONS as readonly string[]).includes(value);
}

export function isWashStatus(value: string): value is WashStatus {
  return (WASH_STATUSES as readonly string[]).includes(value);
}

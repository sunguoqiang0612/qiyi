export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function uniqueStrings(values: string[], limit = 12) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed.slice(0, 24));
    if (result.length >= limit) break;
  }
  return result;
}

export function splitTags(input: string) {
  return uniqueStrings(input.split(/[,，]/));
}

export function buildSearchText(parts: Array<string | string[] | null | undefined>) {
  const flat = parts.flatMap((part) => (Array.isArray(part) ? part : part ? [part] : []));
  return flat.join(" ").toLowerCase().slice(0, 500);
}

export function mediaUrl(imagePath: string | null) {
  if (!imagePath) return null;
  return `/api/media/${imagePath.split("/").map(encodeURIComponent).join("/")}`;
}

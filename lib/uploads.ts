import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { ApiError } from "@/lib/http";

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

const TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function saveUpload(userId: string, file: File) {
  const ext = TYPES[file.type];
  if (!ext) throw new ApiError(400, "只支持 JPG、PNG、WEBP、GIF");
  if (file.size > 8 * 1024 * 1024) throw new ApiError(400, "图片请小于 8MB");
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_ROOT, userId);
  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), bytes);
  return { relative: `${userId}/${filename}`, bytes, mime: file.type };
}

export async function removeUpload(relative: string | null | undefined) {
  if (!relative) return;
  const full = absoluteUpload(relative);
  if (!full) return;
  await fs.unlink(full).catch(() => undefined);
}

export function absoluteUpload(relative: string) {
  const parts = relative.split("/");
  if (parts.length !== 2) return null;
  const [userId, filename] = parts;
  if (!/^[\w-]+$/.test(userId) || !/^[\w.-]+$/.test(filename)) return null;
  const full = path.resolve(UPLOAD_ROOT, userId, filename);
  const root = path.resolve(UPLOAD_ROOT, userId) + path.sep;
  if (!full.startsWith(root)) return null;
  return full;
}

export function mimeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

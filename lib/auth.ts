import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/http";

export const SESSION_COOKIE = "qiyi_session";
const WEEK = 60 * 60 * 24 * 30;

export type SessionUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new ApiError(500, "服务器还没有配置 AUTH_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string) {
  return hash(password, 10);
}

export function checkPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function signSession(userId: string) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

function cookieBase(secure = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: WEEK,
  };
}

export async function setSessionCookie(token: string, secure = false) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieBase(secure));
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function setPrefCookies(locale: string, theme: string) {
  const jar = await cookies();
  const base = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365 };
  jar.set("qiyi_locale", locale === "en" ? "en" : "zh", base);
  jar.set("qiyi_theme", theme === "dark" || theme === "system" ? theme : "light", base);
}

async function loadUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profiles: { orderBy: { createdAt: "asc" } } },
  });
}

async function ensureProfile(user: NonNullable<Awaited<ReturnType<typeof loadUser>>>) {
  if (user.profiles.length === 0) {
    const profile = await prisma.profile.create({
      data: { userId: user.id, name: "我", relation: "self" },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { activeProfileId: profile.id },
    });
    return { ...user, activeProfileId: profile.id, profiles: [profile] };
  }
  if (!user.profiles.some((profile) => profile.id === user.activeProfileId)) {
    const activeProfileId = user.profiles[0].id;
    await prisma.user.update({ where: { id: user.id }, data: { activeProfileId } });
    return { ...user, activeProfileId };
  }
  return user;
}

export const getSessionUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = typeof payload.uid === "string" ? payload.uid : "";
    if (!userId) return null;
    const user = await loadUser(userId);
    if (!user) return null;
    return ensureProfile(user);
  } catch {
    return null;
  }
});

export async function requireApiUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "请先登录");
  const profile = user.profiles.find((item) => item.id === user.activeProfileId) ?? user.profiles[0];
  if (!profile) throw new ApiError(400, "还没有家庭成员");
  return { user, profile };
}

export function requestIsSecure(request: Request) {
  if (process.env.COOKIE_SECURE === "1") return true;
  const proto = request.headers.get("x-forwarded-proto");
  return proto === "https";
}

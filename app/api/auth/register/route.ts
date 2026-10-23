import { Prisma } from "@prisma/client";
import { hashPassword, requestIsSecure, setPrefCookies, setSessionCookie, signSession } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "请填写有效邮箱");
    if (password.length < 8) throw new ApiError(400, "密码至少 8 位");
    if (name.length < 1 || name.length > 40) throw new ApiError(400, "请填写 1-40 个字的名字");
    try {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
          name,
          profiles: { create: { name: "我", relation: "self" } },
        },
        include: { profiles: true },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { activeProfileId: user.profiles[0].id },
      });
      await setSessionCookie(await signSession(user.id), requestIsSecure(request));
      await setPrefCookies(user.locale, user.theme);
      return ok({ id: user.id, name: user.name });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ApiError(409, "这个邮箱已经注册过了");
      }
      throw error;
    }
  });
}

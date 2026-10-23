import { checkPassword, requestIsSecure, setPrefCookies, setSessionCookie, signSession } from "@/lib/auth";
import { ApiError, handle, ok, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  return handle(async () => {
    const body = await readJson(request);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await checkPassword(password, user.passwordHash))) {
      throw new ApiError(401, "邮箱或密码不正确");
    }
    await setSessionCookie(await signSession(user.id), requestIsSecure(request));
    await setPrefCookies(user.locale, user.theme);
    return ok({ id: user.id, name: user.name, locale: user.locale, theme: user.theme });
  });
}

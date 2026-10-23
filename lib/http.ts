import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function handle(work: () => Promise<NextResponse>) {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "服务器开了点小差" }, { status: 500 });
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "请求格式不正确");
  }
}

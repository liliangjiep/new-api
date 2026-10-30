import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.TOAPIS_BASE_URL ?? "https://toapis.cn";
const KEY = () => process.env.TOAPIS_API_KEY ?? "";

/**
 * GET /api/images/generations/:taskId
 * 前端轮询代理 → ToAPI 任务查询。
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  if (!KEY()) {
    return NextResponse.json(
      { error: { code: "gen.upstream_not_configured", message: "服务端未配置 TOAPIS_API_KEY" } },
      { status: 503 }
    );
  }
  const { taskId } = await ctx.params;
  if (!taskId) {
    return NextResponse.json(
      { error: { code: "gen.bad_request", message: "taskId 缺失" } },
      { status: 400 }
    );
  }
  try {
    const upstream = await fetch(`${BASE}/v1/images/generations/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${KEY()}` },
      signal: AbortSignal.timeout(20000),
    });
    const text = await upstream.text();
    let payload: unknown = undefined;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = { raw: text };
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: { code: "gen.upstream_error", message: `查询任务失败（${upstream.status}）` } },
        { status: 502 }
      );
    }
    return NextResponse.json({ data: payload });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "gen.upstream_error", message: `查询任务异常：${(e as Error).message}` } },
      { status: 502 }
    );
  }
}

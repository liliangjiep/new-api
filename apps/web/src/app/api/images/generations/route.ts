import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.TOAPIS_BASE_URL ?? "https://toapis.cn";
const KEY = () => process.env.TOAPIS_API_KEY ?? "";

const SIZE_ALLOW = new Set(["1:1", "3:2", "4:3", "16:9", "9:16", "2:1", "3:4"]);

/**
 * POST /api/images/generations
 * 前端代理 → ToAPI，避免把 TOAPIS_API_KEY 暴露给浏览器。
 * body: { prompt, size, resolution, n, model }
 */
export async function POST(req: NextRequest) {
  if (!KEY()) {
    return NextResponse.json(
      { error: { code: "gen.upstream_not_configured", message: "服务端未配置 TOAPIS_API_KEY" } },
      { status: 503 }
    );
  }
  let body: { prompt?: string; size?: string; resolution?: string; n?: number; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "gen.bad_request", message: "请求体不是合法 JSON" } },
      { status: 400 }
    );
  }
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json(
      { error: { code: "gen.bad_request", message: "prompt 不能为空" } },
      { status: 400 }
    );
  }
  const size = SIZE_ALLOW.has(body.size ?? "") ? body.size! : "1:1";
  const resolution = ["1k", "2k", "4k"].includes(body.resolution ?? "") ? body.resolution! : "1k";
  const n = Math.min(4, Math.max(1, Math.floor(Number(body.n) || 1)));

  try {
    const upstream = await fetch(`${BASE}/v1/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size, resolution, n }),
      signal: AbortSignal.timeout(30000),
    });
    const text = await upstream.text();
    let payload: unknown = undefined;
    try {
      payload = text ? JSON.parse(text) : undefined;
    } catch {
      payload = { raw: text };
    }
    if (!upstream.ok) {
      const msg =
        (payload as { error?: { message?: string }; message?: string })?.error?.message ??
        (payload as { message?: string })?.message ??
        `上游 ${upstream.status}`;
      return NextResponse.json(
        { error: { code: "gen.upstream_error", message: `生图提交失败：${msg}` } },
        { status: 502 }
      );
    }
    return NextResponse.json({ data: payload });
  } catch (e) {
    return NextResponse.json(
      { error: { code: "gen.upstream_error", message: `生图提交异常：${(e as Error).message}` } },
      { status: 502 }
    );
  }
}

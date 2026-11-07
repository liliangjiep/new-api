/**
 * SSE 客户端封装 —— 后端 event-stream 的统一接入。
 * 行内注释1：浏览器原生 EventSource 不支持 POST 头与自定义 Authorization，
 *             所以这里用 fetch + ReadableStream 手动解析 SSE 帧。
 * 行内注释2：解析逻辑兼容 SSE 规范 —— 以空行分隔事件，data: 行可多行。
 * 行内注释3：断线自动重连（指数退避），直到收到终止事件或超过重试上限。
 */

const TOKEN_KEY = "xin.access_token";

export interface SseEvent {
  event: string;
  data: string;
}

export interface SseOptions {
  /** 事件名回调 —— 按名字分发。 */
  onEvent?: (event: SseEvent) => void;
  /** 终止事件名（如 done）—— 收到后停止。 */
  doneEvent?: string;
  /** 出错事件名（如 failed）—— 收到后以错误结束。 */
  errorEvent?: string;
  /** 业务错误事件名 —— 收到后以错误结束（但不是网络错误）。 */
  failEvent?: string;
  signal?: AbortSignal;
  /** 最大重连次数。 */
  maxRetries?: number;
}

export class SseError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "SseError";
    this.code = code;
  }
}

/**
 * 建立 SSE 连接并消费到结束。
 * @param path  接口路径（相对 API_BASE）
 * @param body POST 请求体（GET 接口传 undefined）
 */
export async function streamSse(
  path: string,
  body: unknown,
  opts: SseOptions = {},
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const maxRetries = opts.maxRetries ?? 3;

  let attempt = 0;
  // 行内注释4：重连循环 —— 网络中断时重试，成功消费完则直接返回。
  for (;;) {
    try {
      await consumeOnce(url, body, opts);
      return;
    } catch (e) {
      if (opts.signal?.aborted) {
        return;
      }
      // 行内注释4.1：业务级失败（failed 事件）不重连 —— 重试也没用。
      if (e instanceof SseError) {
        throw e;
      }
      attempt += 1;
      if (attempt > maxRetries) {
        throw e;
      }
      // 行内注释4.2：指数退避 —— 1s / 2s / 4s。
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
}

async function consumeOnce(url: string, body: unknown, opts: SseOptions): Promise<void> {
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: body !== undefined ? "POST" : "GET",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: opts.signal,
    credentials: "include",
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let msg = `SSE 请求失败 (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      msg = parsed?.error?.message ?? msg;
    } catch {
      /* 保留默认信息 */
    }
    throw new SseError(`http.${res.status}`, msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // 行内注释5：按空行切帧 —— SSE 规范以空行结束一个事件。
    let idx = buffer.indexOf("\n\n");
    while (idx !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const parsed = parseFrame(frame);
      if (parsed) {
        const name = parsed.event || "message";
        if (opts.failEvent && name === opts.failEvent) {
          throw new SseError("stream.failed", parsed.data || "生成失败");
        }
        opts.onEvent?.(parsed);
        if (opts.doneEvent && name === opts.doneEvent) {
          return;
        }
      }
      idx = buffer.indexOf("\n\n");
    }
  }
}

/** 解析单帧 —— 返回 { event, data }。 */
function parseFrame(frame: string): SseEvent | null {
  let event = "";
  const dataLines: string[] = [];
  for (const raw of frame.split(/\r?\n/)) {
    if (!raw || raw.startsWith(":")) continue;
    const colon = raw.indexOf(":");
    const field = colon === -1 ? raw : raw.slice(0, colon);
    let value = colon === -1 ? "" : raw.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (!event && dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

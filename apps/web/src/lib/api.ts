/**
 * API 客户端封装
 * 统一错误归一化 + 鉴权注入 + 401 自动登出
 * TODO(API): 后端地址从 NEXT_PUBLIC_API_BASE 读取，联调时替换
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1";

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly traceId?: string;

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.status = status;
    this.code = shape.code;
    this.details = shape.details;
    this.traceId = shape.traceId;
  }
}

export interface ApiResponse<T> {
  data: T;
  request_id: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; page_size: number; total: number };
}

const TOKEN_KEY = "xin.access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, query, headers = {}, idempotencyKey, signal } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (idempotencyKey) finalHeaders["Idempotency-Key"] = idempotencyKey;

  const token = getToken();
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    credentials: "include",
  });

  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(401, { code: "auth.unauthorized", message: "登录已失效，请重新登录" });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? safeParse(text) : undefined;

  if (!res.ok) {
    const shape: ApiErrorShape =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error: ApiErrorShape }).error
        : { code: `http.${res.status}`, message: res.statusText || "请求失败" };
    throw new ApiError(res.status, shape);
  }

  return (payload as { data: T }).data;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    request<T>(path, { method: "GET", query, signal }),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(path, { method: "POST", body, idempotencyKey }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

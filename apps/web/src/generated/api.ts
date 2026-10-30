/**
 * M1-07 契约占位：由 openapi-typescript 从 packages/contracts/openapi.json 生成
 * 当前为手写同构占位，CI 接入后禁止手改（见架构 §5.3）
 * TODO(API): 后端 springdoc 导出 openapi.json 后运行 pnpm gen:api 替换本文件
 */

export interface ApiResponse<T> {
  data: T;
  request_id: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; page_size: number; total: number };
}

export interface QuoteRequest {
  model_key: string;
  spec: string;
  count: number;
}

export interface QuoteResponse {
  estimated_credits: number;
  lines: { label: string; spec?: string; points: number }[];
  fingerprint: string;
  expires_at: string;
}

export interface TaskSubmitRequest {
  model_key: string;
  params: Record<string, unknown>;
  quote_fingerprint: string;
  idempotency_key: string;
}

export interface TaskResponse {
  id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  progress: number;
}

export type paths = Record<string, never>;

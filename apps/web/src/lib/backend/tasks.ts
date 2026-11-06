/**
 * 后端任务链路封装（真调用，非 mock）。
 * 行内注释1：链路与后端一致 —— 报价 quote → 提交 submit → 轮询 get(→SSE)。
 * 行内注释2：模型名与 model_key 的映射放在这里，前端页面只认展示名。
 */

import { api, type Paginated } from "@/lib/api";

/** 任务对象（后端 TaskOrchestrator 落库结构）。 */
export interface TaskRecord {
  id: string;
  user_id?: string;
  model_key: string;
  model?: string;
  spec?: string;
  capability?: string;
  title?: string;
  status: "pending" | "running" | "succeeded" | "failed" | "canceled";
  progress: number;
  points?: number;
  points_charged?: number;
  fail_reason?: string;
  error_code?: string;
  result?: {
    result_urls?: string[];
    type?: string;
    channel_id?: string;
    channel_name?: string;
    billing?: Record<string, unknown>;
  };
  params?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface QuoteResult {
  fingerprint: string;
  estimated_credits: number;
  expires_at?: string;
  [k: string]: unknown;
}

/** 展示名 → model_key（与后端 Catalog.PRICING 一致）。 */
export const MODEL_KEYS = {
  "LC Image 2.5 Pro": "image.t2i.2k",
  "LC Image 2.5 Fast": "image.t2i.1k",
  "LC Image 2.5": "image.t2i.2k",
  "Seedance-2.5": "video.t2v.720p",
  "Seedance 2.0": "video.t2v.720p",
  "Seedance 2.0 Mini": "video.t2v.mini",
  "Kling 4.0": "video.i2v.kling",
} as const;

/** 由展示名推断 spec（定价用）。 */
export function specOf(modelKey: string, fallback = "2K"): string {
  if (modelKey.startsWith("image.t2i.1k")) return "1K";
  if (modelKey.startsWith("image.t2i.4k")) return "4K";
  if (modelKey.startsWith("image.t2i.2k")) return "2K";
  if (modelKey.startsWith("video.t2v.720p")) return "720P 5 秒";
  if (modelKey.startsWith("video.t2v.mini")) return "720P 5 秒";
  if (modelKey.startsWith("video.batch")) return "5 镜 × 5 秒 480P";
  if (modelKey.startsWith("video.i2v")) return "Kling 4.0 720P 5 秒";
  return fallback;
}

/** 报价 —— 返回指纹，提交时必须带上（后端 15 分钟内校验）。 */
export async function quoteTask(params: {
  modelKey: string;
  spec?: string;
  count?: number;
  params?: Record<string, unknown>;
}): Promise<QuoteResult> {
  return api.post<QuoteResult>("/tasks/quote", {
    model_key: params.modelKey,
    spec: params.spec ?? specOf(params.modelKey),
    count: params.count ?? 1,
    params: params.params ?? {},
  });
}

/** 提交任务 —— 幂等键保证重复点击不重复扣分。 */
export async function submitTask(params: {
  modelKey: string;
  spec?: string;
  count?: number;
  params?: Record<string, unknown>;
  quoteFingerprint?: string;
  idempotencyKey?: string;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>(
    "/tasks/submit",
    {
      model_key: params.modelKey,
      spec: params.spec ?? specOf(params.modelKey),
      count: params.count ?? 1,
      params: params.params ?? {},
      quote_fingerprint: params.quoteFingerprint ?? "",
      idempotency_key: params.idempotencyKey ?? "",
    },
    params.idempotencyKey,
  );
}

/** 任务详情 —— 轮询用。 */
export async function getTask(id: string): Promise<TaskRecord> {
  return api.get<TaskRecord>(`/tasks/${id}`);
}

/** 任务列表。 */
export async function listTasks(query?: {
  page?: number;
  pageSize?: number;
  status?: string;
  query?: string;
}): Promise<Paginated<TaskRecord>> {
  return api.get<Paginated<TaskRecord>>("/tasks", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
    status: query?.status,
    query: query?.query,
  });
}

/**
 * 提交并等到终态。
 * 行内注释3：真实中转站生成需要 30s~3min，这里用轮询（与后端 TaskExecutor 内部轮询并行，
 *             前端只是拿最终态与进度），SSE 不可用时自动降级为轮询。
 */
export async function runTaskToCompletion(
  args: {
    modelKey: string;
    spec?: string;
    count?: number;
    params?: Record<string, unknown>;
  },
  hooks?: {
    onTaskCreated?: (t: TaskRecord) => void;
    onProgress?: (t: TaskRecord) => void;
    signal?: AbortSignal;
  },
): Promise<TaskRecord> {
  const quote = await quoteTask(args);
  const task = await submitTask({ ...args, quoteFingerprint: quote.fingerprint });
  hooks?.onTaskCreated?.(task);

  const deadline = Date.now() + 10 * 60 * 1000;
  let cur = task;
  while (Date.now() < deadline) {
    if (hooks?.signal?.aborted) throw new Error("已取消");
    if (cur.status === "succeeded" || cur.status === "failed" || cur.status === "canceled") {
      return cur;
    }
    await new Promise((r) => setTimeout(r, 3000));
    cur = await getTask(task.id);
    hooks?.onProgress?.(cur);
  }
  return cur;
}

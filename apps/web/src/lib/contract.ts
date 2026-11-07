/**
 * 后端契约类型（与 service/api 的 DTO 一一对应）
 * 字段名全部 snake_case，与 docs/new-ai-后端接口-V1.md §2 一致。
 * 联调时以本文件为准替换各页面的 mock 数据。
 */

/** 统一响应包装 —— 与 lib/api.ts 的 ApiResponse 同构。 */
export interface ApiEnvelope<T> {
  data: T;
  request_id: string;
}

/** 统一错误体。 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  trace_id?: string;
}

// ---------------- 认证与用户 ----------------

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  session_id: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  nickname: string;
  phone: string;
  role: string;
  balance: number;
}

export interface SessionItem {
  id: string;
  device: string;
  ip: string;
  created_at: string;
  current: boolean;
}

export interface UserProfile {
  id: string;
  nickname: string;
  phone: string;
  email: string;
  company: string;
  bio: string;
  avatar_url: string;
  role: string;
  balance: number;
  frozen: number;
  expires_at: string;
}

// ---------------- 积分与充值 ----------------

export interface PointBalance {
  available: number;
  frozen: number;
  expires_at: string;
}

export type LedgerType = "recharge" | "consume" | "refund" | "bonus" | "freeze" | "settle" | "adjust";

export interface LedgerItem {
  id: string;
  time: string;
  type: string;
  amount: number;
  balance: number;
  note: string;
  task_id: string | null;
  order_no: string | null;
}

export interface RechargePackage {
  code: string;
  name: string;
  amount: number;
  credits: number;
  bonus_rate: number;
  audience: string;
}

export interface RechargeOrder {
  id: string;
  order_no: string;
  no: string;
  package_name: string;
  package_code: string;
  amount: number;
  credits: number;
  bonus?: number;
  /** 原始状态码：pending / paid / closed / refunded。 */
  status: string;
  /** 后端冗余的中文状态文案（前端优先用自己的映射表）。 */
  status_label?: string;
  pay_method?: string;
  pay_url?: string;
  created_at: string;
  paid_at?: string;
}

// ---------------- 任务链 ----------------

export interface QuoteLine {
  label: string;
  spec: string;
  points: number;
  discount?: string | null;
}

export interface QuoteResult {
  estimated_credits: number;
  lines: QuoteLine[];
  model_key: string;
  model: string;
  fingerprint: string;
  expires_at: string;
}

export type TaskStatus = "pending" | "running" | "succeeded" | "failed";

export interface TaskItem {
  id: string;
  title: string;
  capability: string;
  status: TaskStatus;
  progress: number;
  points: number;
  points_charged: number;
  model: string;
  model_key: string;
  fail_reason: string;
  error_code: string;
  result: Record<string, unknown>;
  params: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  usage_record?: {
    channel: string;
    upstream_cost: number;
    points_charged: number;
  };
}

export interface BatchItem {
  id: string;
  status: string;
  item_count: number;
  task_ids: string[];
  created_at: string;
}

// ---------------- 资产 ----------------

export type AssetKind = "image" | "video" | "audio";
export type AssetSource = "all" | "upload" | "ai";

export interface AssetItem {
  id: string;
  name: string;
  kind: AssetKind;
  size: number;
  created_at: string;
  group: string;
  tags: string[];
  thumb: string;
  url: string;
  duration: number;
  source: string;
}

export interface UploadPolicy {
  upload_url: string;
  asset_id: string;
  headers: Record<string, string>;
  expires_in: number;
}

export interface AssetGroup {
  id: string;
  name: string;
  count: number;
}

// ---------------- 公开接口 ----------------

export interface ModelRoute {
  key: string;
  label: string;
  provider: string;
  capability: string;
  discount_rate: number;
  enabled: boolean;
}

export interface PricingItem {
  capability: string;
  label: string;
  spec: string;
  points: number;
  margin: number;
  model: string;
  model_key?: string;
}

export interface ImageSkill {
  key: string;
  label: string;
  description: string;
  prompt_template: string;
}

export interface VideoSkill {
  key: string;
  label: string;
  category: string;
  description: string;
  ref_slots: { images: number; videos: number; audios: number };
}

export interface DiscoverItem {
  id: string;
  title: string;
  cover_url: string;
  capability: string;
  points: number;
  tags: string[];
  tool_href: string;
  params_snapshot: Record<string, unknown>;
  likes: number;
  created_at: string;
}

// ---------------- 画布 ----------------

export interface CanvasProject {
  id: string;
  title: string;
  at: string;
  version: number;
}

export interface CanvasDetail {
  id: string;
  title: string;
  version: number;
  nodes: Array<{ id: string; x: number; y: number; text: string }>;
  edges: unknown[];
  share_url: string;
  updated_at: string;
}

// ---------------- 数字人 ----------------

export interface Avatar {
  id: string;
  name: string;
  url: string;
  standardized: boolean;
}

export interface Voice {
  id: string;
  name: string;
  source: string;
  created_at: string;
}

// ---------------- 后台 ----------------

export interface AuditLog {
  id: string;
  operator: string;
  action: string;
  target: string;
  diff: Record<string, unknown>;
  reason: string;
  trace_id: string;
  created_at: string;
}

export interface ChannelBalance {
  name: string;
  balance: number;
  days_left: number;
  level: "normal" | "warning" | "critical" | "urgent";
  level_label: string;
}

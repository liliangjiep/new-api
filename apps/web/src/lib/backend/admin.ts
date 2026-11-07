/**
 * 运营后台接口封装（真调用）。
 * 行内注释1：后台 20 分组全部收敛到 /admin/* —— 这里按分组给出强类型封装。
 * 行内注释2：写操作全部落审计（后端 AdminService.audit），前端只负责带参数。
 */

import { api, type Paginated } from "@/lib/api";

/* ---------------- 用户 ---------------- */

export interface AdminUser {
  id: string;
  nickname: string;
  phone: string;
  role: string;
  balance: number;
  status: "正常" | "封禁";
  created_at: string;
}

export async function listAdminUsers(query?: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<Paginated<AdminUser>> {
  return api.get<Paginated<AdminUser>>("/admin/users", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
    q: query?.q,
    status: query?.status,
  });
}

export async function getAdminUser(id: string): Promise<Record<string, unknown>> {
  return api.get(`/admin/users/${id}`);
}

export async function banUser(id: string): Promise<void> {
  return api.post(`/admin/users/${id}/ban`);
}

export async function unbanUser(id: string): Promise<void> {
  return api.post(`/admin/users/${id}/unban`);
}

export async function forceLogoutUser(id: string): Promise<void> {
  return api.post(`/admin/users/${id}/force-logout`);
}

/* ---------------- 内容审核 ---------------- */

export interface ReviewItem {
  id: string;
  title: string;
  user: string;
  thumb: string;
  status: "pending" | "approved" | "rejected";
}

export async function listReview(status?: string): Promise<ReviewItem[]> {
  return api.get("/admin/review", { status });
}

export async function approveReview(id: string, reason?: string): Promise<void> {
  return api.post(`/admin/review/${id}/approve`, { reason });
}

export async function rejectReview(id: string, reason?: string): Promise<void> {
  return api.post(`/admin/review/${id}/reject`, { reason });
}

/* ---------------- 充值套餐 ---------------- */

export interface RechargePackage {
  code: string;
  name: string;
  amount: number;
  credits: number;
  enabled: boolean;
}

export async function listPackages(): Promise<RechargePackage[]> {
  return api.get("/admin/packages");
}

export async function upsertPackage(body: {
  code: string;
  name: string;
  amount: number;
  credits: number;
  enabled: boolean;
}): Promise<RechargePackage> {
  return api.post("/admin/packages", body);
}

export async function deletePackage(code: string): Promise<void> {
  return api.delete(`/admin/packages/${code}`);
}

/** 积分补发/扣减 —— 大额（≥1000）需 confirmed=true 二次确认。 */
export async function adjustCredits(body: {
  user_id: string;
  amount: number;
  reason: string;
  confirmed?: boolean;
}): Promise<Record<string, unknown>> {
  return api.post("/admin/credits/adjust", body);
}

/* ---------------- 积分流水 ---------------- */

export interface AdminLedgerRow {
  id: string;
  user_id: string;
  /** 原始码：recharge / settle / refund / adjust / freeze。 */
  type: string;
  /** 中文标签（后端冗余给的兜底文案），前端可直接展示。 */
  type_label?: string;
  amount: number;
  balance: number;
  note: string;
  created_at: string;
}

export async function listAdminLedger(query?: {
  page?: number;
  pageSize?: number;
  type?: string;
}): Promise<Paginated<AdminLedgerRow>> {
  return api.get<Paginated<AdminLedgerRow>>("/admin/ledger", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
    type: query?.type,
  });
}

/* ---------------- 技能包 ---------------- */

export interface SkillPackageRow {
  id: string;
  label: string;
  description: string;
  prompt_template: string;
  version: string;
  enabled: boolean;
}

export async function listSkillPackages(q?: string): Promise<SkillPackageRow[]> {
  return api.get("/admin/skill-packages", { q });
}

export async function upsertSkillPackage(body: {
  id?: string;
  label: string;
  description: string;
  prompt_template: string;
  version: string;
  enabled: boolean;
}): Promise<SkillPackageRow> {
  return api.post("/admin/skill-packages", body);
}

export async function deleteSkillPackage(id: string): Promise<void> {
  return api.delete(`/admin/skill-packages/${id}`);
}

/* ---------------- 视频技能 ---------------- */

export interface VideoSkillRow {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
  option_groups: Record<string, unknown>;
  ref_slots?: { images: number; videos: number; audios: number };
}

export async function listVideoSkills(): Promise<VideoSkillRow[]> {
  return api.get("/admin/video-skills");
}

/** 批量保存视频技能开关与选项组。 */
export async function saveVideoSkills(
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  return api.put("/admin/video-skills", rows);
}

/* ---------------- 公告 ---------------- */

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  range: string;
  status: string;
  created_at: string;
}

export async function listAnnouncements(): Promise<AnnouncementRow[]> {
  return api.get("/admin/announcements");
}

export async function createAnnouncement(body: {
  title: string;
  body: string;
  range?: string;
}): Promise<AnnouncementRow> {
  return api.post("/admin/announcements", body);
}

export async function updateAnnouncement(
  id: string,
  body: { pinned?: boolean; status?: string },
): Promise<void> {
  return api.patch(`/admin/announcements/${id}`, body);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return api.delete(`/admin/announcements/${id}`);
}

/* ---------------- 公共素材 ---------------- */

export interface PublicAssetRow {
  id: string;
  name: string;
  scope: string;
  thumb: string;
}

export async function listPublicAssets(scope?: string): Promise<PublicAssetRow[]> {
  return api.get("/admin/public-assets", { scope });
}

export async function setPublicAssetScope(ids: string[], scope: string): Promise<void> {
  return api.post("/admin/public-assets/scope", { ids, scope });
}

/* ---------------- 通道 ---------------- */

export interface ChannelRow {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  api_key_masked: string;
  protocol: string;
  capabilities: string;
  priority: number;
  rpm_limit: number;
  cost_ratio: number;
  status: string;
  circuit_state: string;
  consecutive_failures: number;
  balance: number;
  remark: string;
}

export async function listChannels(): Promise<ChannelRow[]> {
  return api.get("/admin/channels");
}

export async function upsertChannel(body: {
  id?: string;
  name: string;
  provider: string;
  base_url: string;
  api_key?: string;
  protocol?: string;
  template_json?: string;
  capabilities?: string;
  priority?: number;
  rpm_limit?: number;
  cost_ratio?: number;
  status?: string;
  remark?: string;
}): Promise<ChannelRow> {
  return api.post("/admin/channels", body);
}

export async function setChannelStatus(id: string, status: string): Promise<void> {
  return api.patch(`/admin/channels/${id}`, { status });
}

/** 通道余额巡检 —— 30/14/7 天三级告警。 */
export async function listChannelBalances(): Promise<
  Array<{
    name: string;
    balance: number;
    days_left: number;
    level: string;
    level_label: string;
  }>
> {
  return api.get("/admin/channels/balances");
}

/* ---------------- 接入点 ---------------- */

export interface EndpointRow {
  id: string;
  model_key: string;
  display_name: string;
  channel_id: string;
  base_url: string;
  upstream_model: string;
  timeout_ms: number;
  max_retries: number;
  sort_order: number;
  enabled: boolean;
  param_map_json: string;
  template_json: string;
}

export async function listEndpoints(): Promise<EndpointRow[]> {
  return api.get("/admin/endpoints");
}

export async function upsertEndpoint(body: {
  id?: string;
  model_key: string;
  display_name: string;
  channel_id: string;
  base_url: string;
  upstream_model: string;
  timeout_ms?: number;
  max_retries?: number;
  sort_order?: number;
  enabled?: boolean;
  param_map_json?: string;
  template_json?: string;
}): Promise<EndpointRow> {
  return api.post("/admin/endpoints", body);
}

export async function toggleEndpoint(id: string, enabled: boolean): Promise<void> {
  return api.patch(`/admin/endpoints/${id}`, { enabled });
}

/** 批量切通道 —— 同一 model_key 全部指向新通道。 */
export async function switchChannel(
  modelKey: string,
  channelId: string,
): Promise<{ updated: number }> {
  return api.post("/admin/endpoints/switch-channel", {
    model_key: modelKey,
    channel_id: channelId,
  });
}

/** 接入点变更留痕。 */
export async function listEndpointChanges(): Promise<
  Array<Record<string, unknown>>
> {
  return api.get("/admin/endpoint-changes");
}

/* ---------------- 售价积分 ---------------- */

export interface PricingRow {
  model_key: string;
  spec: string;
  points: number;
  cost: number;
}

export async function listPricing(): Promise<PricingRow[]> {
  return api.get("/admin/pricing");
}

export async function updatePricing(body: {
  model_key: string;
  spec: string;
  points: number;
  reason: string;
}): Promise<Record<string, unknown>> {
  return api.post("/admin/pricing", body);
}

export async function listPricingChanges(): Promise<
  Array<Record<string, unknown>>
> {
  return api.get("/admin/pricing/changes");
}

/* ---------------- 对账 ---------------- */

export interface BillRow {
  channel: string;
  upstream_count: number;
  platform_count: number;
  diff: number;
  cost: number;
  day: string;
}

export async function listBills(day?: string): Promise<BillRow[]> {
  return api.get("/admin/bills", { day });
}

export async function reconcileBills(day?: string): Promise<Record<string, unknown>> {
  return api.post("/admin/bills/reconcile", { day });
}

/* ---------------- 发票 ---------------- */

export interface AdminInvoiceRow {
  id: string;
  title: string;
  amount: number;
  /** 后台口径：pending（待开票）/ approved（已开票）/ rejected（已驳回）。 */
  status: string;
  /** 后端原始码（pending / done / rejected），status 是它的归一化结果。 */
  status_code?: string;
  invoice_no: string;
  created_at: string;
}

export async function listAdminInvoices(status?: string): Promise<AdminInvoiceRow[]> {
  return api.get("/admin/invoices", { status });
}

export async function approveInvoice(id: string, reason?: string): Promise<void> {
  return api.post(`/admin/invoices/${id}/approve`, { reason });
}

export async function rejectInvoice(id: string, reason?: string): Promise<void> {
  return api.post(`/admin/invoices/${id}/reject`, { reason });
}

/* ---------------- 分销与结算 ---------------- */

export interface PartnerRow {
  id: string;
  name: string;
  rate: number;
  status: string;
  pending_amount: number;
}

export async function listPartners(): Promise<PartnerRow[]> {
  return api.get("/admin/partners");
}

export async function createPartner(body: {
  name: string;
  rate: number;
}): Promise<PartnerRow> {
  return api.post("/admin/partners", body);
}

export async function pausePartner(id: string): Promise<void> {
  return api.post(`/admin/partners/${id}/pause`);
}

export interface SettlementRow {
  id: string;
  period: string;
  amount: number;
  status: string;
  created_at: string;
}

export async function listSettlements(period?: string): Promise<SettlementRow[]> {
  return api.get("/admin/settlements", { period });
}

export async function generateSettlement(
  period: string,
): Promise<SettlementRow> {
  return api.post("/admin/settlements/generate", { period });
}

export async function confirmSettlement(id: string): Promise<void> {
  return api.post(`/admin/settlements/${id}/confirm`);
}

/* ---------------- 报表 / 看板 / 审计 ---------------- */

export async function getTaskReports(capability?: string): Promise<{
  rows: Array<{
    capability: string;
    total: number;
    success_rate: number;
    points: number;
  }>;
}> {
  return api.get("/admin/reports/tasks", { capability });
}

export async function getDashboard(): Promise<{
  task_total: number;
  task_success_rate: number;
  points_revenue: number;
  user_total: number;
  asset_total: number;
}> {
  return api.get("/admin/dashboard");
}

export interface AuditRow {
  id: string;
  operator: string;
  action: string;
  target: string;
  trace_id: string;
  created_at: string;
  ip?: string;
}

export async function listAuditLogs(query?: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<Paginated<AuditRow>> {
  return api.get<Paginated<AuditRow>>("/admin/audit", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
    q: query?.q,
  });
}

/* ---------------- 邀请码 ---------------- */

export interface InviteCodeRow {
  code: string;
  status: string;
  used_by: string;
  created_at: string;
}

export async function listInviteCodes(): Promise<InviteCodeRow[]> {
  return api.get("/admin/invite-codes");
}

export async function generateInviteCodes(count: number): Promise<InviteCodeRow[]> {
  return api.post("/admin/invite-codes/generate", { count });
}

export async function revokeInviteCode(code: string): Promise<void> {
  return api.delete(`/admin/invite-codes/${encodeURIComponent(code)}`);
}

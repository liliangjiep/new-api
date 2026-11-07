/**
 * 积分 / 充值后端封装（真调用）。
 * 行内注释1：有效期由后端按「充值时间 + 2 年」计算，前端只展示 expires_at。
 */

import { api, type Paginated } from "@/lib/api";

export interface BalanceView {
  available: number;
  frozen: number;
  expires_at: string;
}

export interface LedgerItem {
  id: string;
  /** 原始类型码 —— recharge/freeze/settle/refund/adjust，用于状态判断与筛选。 */
  type: string;
  /** 中文名 —— 后端冗余给的兜底文案（充值/冻结/消耗/退回/赠送）。 */
  type_label?: string;
  amount: number;
  balance: number;
  note?: string;
  task_id?: string;
  order_no?: string;
  created_at: string;
}

export async function getBalance(): Promise<BalanceView> {
  return api.get<BalanceView>("/points/balance");
}

export async function getLedger(query?: {
  page?: number;
  pageSize?: number;
  type?: string;
}): Promise<Paginated<LedgerItem>> {
  return api.get<Paginated<LedgerItem>>("/points/ledger", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
    type: query?.type,
  });
}

/**
 * 充值订单 —— 与后端 RechargeService.view 的字段一一对应。
 * 行内注释1.1：status 是原始码（pending/paid/closed/refunded），
 *              中文由前端 STATUS_LABEL 映射；status_label 是后端冗余给的兜底文案。
 */
export interface RechargeOrder {
  id: string;
  order_no: string;
  no: string;
  package_name: string;
  package_code: string;
  credits: number;
  bonus?: number;
  amount: number;
  status: string;
  status_label?: string;
  pay_method?: string;
  pay_url?: string;
  created_at: string;
  paid_at?: string;
}

/** 创建充值订单 —— 幂等键必带。 */
export async function createRechargeOrder(
  body: { packageCode: string; payMethod: string },
  idempotencyKey: string,
): Promise<RechargeOrder> {
  // 行内注释1：后端 Jackson 全局 snake_case，请求体字段同样用 snake_case。
  return api.post<RechargeOrder>(
    "/recharge/orders",
    { package_code: body.packageCode, pay_method: body.payMethod },
    idempotencyKey,
  );
}

export async function listRechargeOrders(query?: {
  page?: number;
  pageSize?: number;
}): Promise<Paginated<RechargeOrder>> {
  return api.get<Paginated<RechargeOrder>>("/recharge/orders", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
  });
}

/**
 * 公开套餐表 —— GET /recharge/packages。
 * 行内注释2：必须走后端 —— 后台运营可在 /admin/packages 改金额/积分/上下架，
 *             前端写死常量会出现「后台改了价、用户按旧价充值」的钱账不符。
 *             拉取失败时前端回落本地常量，保证页面仍可用。
 */
export interface RechargePackageRow {
  code: string;
  name: string;
  amount: number;
  credits: number;
  bonus_rate?: number;
  audience?: string;
  enabled?: boolean;
}

export async function listRechargePackages(): Promise<RechargePackageRow[]> {
  return api.get<RechargePackageRow[]>("/recharge/packages");
}

/**
 * 兑换充值卡 —— POST /recharge-cards/redeem。
 * 行内注释3：一张卡只能兑换一次 —— 重复兑换后端返回 409 且不加积分。
 */
export async function redeemRechargeCard(code: string): Promise<{
  code: string;
  points: number;
  balance: number;
  message: string;
}> {
  return api.post("/recharge-cards/redeem", { code });
}

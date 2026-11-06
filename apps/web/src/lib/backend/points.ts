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
  type: string;
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

export interface RechargeOrder {
  id: string;
  order_no: string;
  credits: number;
  bonus?: number;
  amount_yuan?: number;
  status: string;
  pay_url?: string;
  created_at: string;
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

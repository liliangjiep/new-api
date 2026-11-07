/**
 * 发票 / 订单 / 密钥 后端封装（真调用）。
 * 行内注释1：这些接口在后端都存在（/invoices、/recharge/orders），之前前端是写死的假数据。
 * 行内注释2：API 密钥管理后端暂无对应表（属于待建表项），前端保留本地生成并明确标注。
 */

import { api, type Paginated } from "@/lib/api";

export interface InvoiceItem {
  id: string;
  title_type: string;
  title: string;
  tax_no: string;
  amount: number;
  status: string;
  order_nos?: string[];
  created_at: string;
}

export async function listInvoices(query?: {
  page?: number;
  pageSize?: number;
}): Promise<Paginated<InvoiceItem>> {
  return api.get<Paginated<InvoiceItem>>("/invoices", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 20,
  });
}

/** 申请开票 —— 企业抬头必填税号（后端会校验 15~20 位）。 */
export async function createInvoice(body: {
  title_type: "个人" | "企业";
  title: string;
  tax_no: string;
  amount: number;
  order_nos?: string[];
}): Promise<InvoiceItem> {
  return api.post<InvoiceItem>("/invoices", body);
}

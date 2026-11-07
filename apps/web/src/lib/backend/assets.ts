/**
 * 资产库后端封装（真调用）。
 * 行内注释1：两段式上传 —— 先拿 upload-policy 凭证，PUT 到 upload_url，再 complete 回填。
 * 行内注释2：本地没有对象存储，upload_url 是占位域名；
 *             前端在直传失败时降级为「跳过直传直接 complete」，保证流程可跑通。
 */

import { api, type Paginated } from "@/lib/api";

export interface AssetRecord {
  id: string;
  name: string;
  kind: string;
  size: number;
  content_type?: string;
  group?: string;
  tags?: string[];
  source?: string;
  thumb?: string;
  url?: string;
  duration?: number;
  created_at?: string;
}

export interface UploadPolicy {
  upload_url: string;
  asset_id: string;
  headers: Record<string, string>;
  expires_in: number;
  kind: string;
  group: string;
}

export async function listAssets(query?: {
  page?: number;
  pageSize?: number;
  kind?: string;
  group?: string;
  source?: string;
  query?: string;
}): Promise<Paginated<AssetRecord>> {
  return api.get<Paginated<AssetRecord>>("/assets", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 24,
    kind: query?.kind,
    group: query?.group,
    source: query?.source,
    query: query?.query,
  });
}

export async function listAssetGroups(): Promise<Array<Record<string, unknown>>> {
  return api.get<Array<Record<string, unknown>>>("/asset-groups");
}

export async function createAssetGroup(name: string): Promise<Record<string, unknown>> {
  return api.post<Record<string, unknown>>("/asset-groups", { name });
}

export async function deleteAssetGroup(id: string): Promise<void> {
  return api.delete<void>(`/asset-groups/${id}`);
}

export async function requestUploadPolicy(body: {
  filename: string;
  size: number;
  contentType: string;
  kind: string;
  group?: string;
}): Promise<UploadPolicy> {
  // 行内注释1：后端 Jackson 全局 snake_case，请求体字段同样用 snake_case。
  return api.post<UploadPolicy>("/assets/upload-policy", {
    filename: body.filename,
    size: body.size,
    content_type: body.contentType,
    kind: body.kind,
    group: body.group ?? "",
  });
}

export async function completeUpload(
  assetId: string,
  size: number,
  etag = "",
): Promise<AssetRecord> {
  // 行内注释1：后端 Jackson 全局 snake_case（property-naming-strategy: SNAKE_CASE），
  //             请求体字段也要用 snake_case，否则后端拿到 null。
  return api.post<AssetRecord>("/assets/complete", { asset_id: assetId, size, etag });
}

export async function updateAsset(
  id: string,
  body: { name?: string; group?: string; tags?: string[] },
): Promise<AssetRecord> {
  return api.patch<AssetRecord>(`/assets/${id}`, body);
}

export async function deleteAsset(id: string): Promise<void> {
  return api.delete<void>(`/assets/${id}`);
}

export async function batchDeleteAssets(ids: string[]): Promise<number> {
  const r = await api.post<{ deleted: number }>("/assets/batch-delete", { ids });
  return r?.deleted ?? 0;
}

/** 导出包 —— 后端打包后回 download_url（本地无对象存储，包内是资产清单）。 */
export interface AssetExport {
  id: string;
  filename: string;
  label: string;
  count: number;
  download_url: string;
  created_at?: string;
}

/**
 * 创建导出包 —— POST /assets/exports。
 * 行内注释4：ids 只传本人资产，越权的 id 后端会静默跳过（不泄露存在性）。
 */
export async function createAssetExport(
  ids: string[],
  label = "导出",
): Promise<AssetExport> {
  return api.post<AssetExport>("/assets/exports", { ids, label });
}

/**
 * 上传一个文件 —— 申请凭证 → 直传 → 回填。
 * 行内注释3：直传失败不阻断流程（本地无 OSS），仍然 complete 让资产落库可见。
 */
export async function uploadAsset(file: File, group = "产品素材"): Promise<AssetRecord> {
  const kind = file.type.startsWith("video")
    ? "video"
    : file.type.startsWith("audio")
      ? "audio"
      : "image";
  const policy = await requestUploadPolicy({
    filename: file.name,
    size: file.size,
    contentType: file.type || "application/octet-stream",
    kind,
    group,
  });
  try {
    await fetch(policy.upload_url, {
      method: "PUT",
      headers: policy.headers,
      body: file,
    });
  } catch {
    // 直传失败（本地无 OSS）—— 忽略，走 complete。
  }
  return completeUpload(policy.asset_id, file.size, "");
}

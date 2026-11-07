/**
 * 视频工具链后端封装（真调用）。
 * 行内注释1：所有工具接口内部都收敛到 quote → submit，返回的就是统一任务对象，
 *             所以这里直接复用 TaskRecord 类型。
 * 行内注释2：请求体字段用 snake_case —— 后端 Jackson 全局 SNAKE_CASE。
 */

import { api } from "@/lib/api";
import type { TaskRecord } from "@/lib/backend/tasks";

/** 深度克隆 —— mode: depth | storyboard | element-replace。 */
export async function submitDepthClone(body: {
  mode: string;
  ref_video_asset_id: string;
  ref_image_asset_ids?: string[];
  prompt?: string;
  model?: string;
  spec?: string;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/depth-clone/jobs", body);
}

/** 商详套图 —— 一次提交返回批次（count 决定张数，缺省 6）。 */
export async function submitEcommerceSet(body: {
  product_asset_ids: string[];
  lang?: string;
  ratio?: string;
  model?: string;
  resolution?: string;
  format?: string;
  count?: number;
}): Promise<{ id: string; status: string; item_count: number; task_ids: string[] }> {
  return api.post("/tools/ecommerce-set/jobs", body);
}

/** 商详套图单张重生成。 */
export async function regenerateEcommerceItem(
  taskId: string,
  batchId: string,
): Promise<TaskRecord> {
  return api.post<TaskRecord>(
    `/tools/ecommerce-set/items/${taskId}/regenerate?batchId=${encodeURIComponent(batchId)}`,
  );
}

/** 视频混剪。 */
export async function submitRemix(body: {
  source_video_asset_id: string;
  strategy?: string;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/video-remix/jobs", body);
}

/** 爆款混剪。 */
export async function submitViralRemix(body: {
  source_video_asset_id: string;
  strategy?: string;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/video-remix-viral/jobs", body);
}

/** 画质增强。 */
export async function submitQualityEnhance(body: {
  video_asset_id: string;
  target?: string;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/video-quality-enhance/jobs", body);
}

/** 字幕擦除 —— regions 必填（框选区域）。 */
export async function submitSubtitleErase(body: {
  video_asset_id: string;
  regions: Array<{ x: number; y: number; w: number; h: number }>;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/video-subtitle-erase/jobs", body);
}

/** 水印擦除。 */
export async function submitWatermarkRemove(body: {
  video_asset_id: string;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/video-watermark-remove/jobs", body);
}

/** 视频创作者 —— skill_pack 必填，参考素材数不超过 ref_slots。 */
export async function submitVideoCreator(body: {
  skill_pack: string;
  ref_image_ids?: string[];
  ref_video_ids?: string[];
  ref_audio_ids?: string[];
  prompt?: string;
  model?: string;
  spec?: string;
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/video-creator/jobs", body);
}

/** 石材效果图。 */
export async function submitStoneEffect(body: {
  material_asset_id?: string;
  main_color?: string;
  texture_desc?: string;
  scene_key: string;
  lighting?: string;
  resolution?: string;
  views?: string[];
}): Promise<TaskRecord> {
  return api.post<TaskRecord>("/tools/stone/effect-jobs", body);
}

/** 石材材质库 —— 列表。 */
export async function listStoneMaterials(query?: {
  page?: number;
  pageSize?: number;
  tags?: string;
  query?: string;
}): Promise<{
  data: Array<{
    id: string;
    name: string;
    asset_id: string;
    tags: string[];
    attrs: Record<string, unknown>;
    created_at: string;
  }>;
}> {
  return api.get("/tools/stone/materials", {
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 50,
    tags: query?.tags,
    query: query?.query,
  });
}

/** 石材材质 —— 新增。 */
export async function createStoneMaterial(body: {
  asset_id: string;
  name: string;
  tags?: string[];
  attrs?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  return api.post("/tools/stone/materials", body);
}

/** 石材材质 —— 删除。 */
export async function deleteStoneMaterial(id: string): Promise<void> {
  return api.delete(`/tools/stone/materials/${id}`);
}

/** 石材材质 —— 导出打包，返回真实可下载的 zip 地址。 */
export async function exportStoneMaterials(ids: string[]): Promise<{
  download_url: string;
  filename: string;
  count: number;
}> {
  return api.post("/tools/stone/materials/export", { ids });
}

/** 石材场景模板。 */
export async function listStoneSceneTemplates(): Promise<
  Array<{
    key: string;
    label: string;
    group: string;
    lighting: string;
    prompt_template: string;
  }>
> {
  return api.get("/tools/stone/scene-templates");
}

/** 厂家介绍视频。 */
export async function submitFactoryVideo(body: {
  avatar_id: string;
  site_asset_ids: string[];
  template_id: string;
  variables?: Record<string, unknown>;
  spec?: string;
}): Promise<TaskRecord> {
  return api.post("/tools/stone/factory-video-jobs", body);
}

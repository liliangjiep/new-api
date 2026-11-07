/**
 * 画布后端封装（真调用）。
 * 行内注释1：nodes/edges 是任意 JSON 数组 —— 前端卡片结构 {id,x,y,text} 直接塞进 nodes 即可。
 * 行内注释2：保存要带 version —— 服务端比对，不一致返回 409 canvas.version_conflict。
 */

import { api } from "@/lib/api";

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface CanvasSummary {
  id: string;
  title: string;
  at: string;
  version: number;
}

export interface CanvasDetail {
  id: string;
  title: string;
  version: number;
  nodes: CanvasNode[];
  edges: unknown[];
  share_url: string;
  updated_at: string;
}

export async function listCanvases(): Promise<CanvasSummary[]> {
  return api.get<CanvasSummary[]>("/canvases");
}

export async function createCanvas(title?: string): Promise<CanvasDetail> {
  return api.post<CanvasDetail>("/canvases", { title: title ?? "" });
}

export async function getCanvas(id: string): Promise<CanvasDetail> {
  return api.get<CanvasDetail>(`/canvases/${id}`);
}

export async function renameCanvas(id: string, title: string): Promise<CanvasDetail> {
  return api.patch<CanvasDetail>(`/canvases/${id}`, { title });
}

export async function deleteCanvas(id: string): Promise<void> {
  return api.delete<void>(`/canvases/${id}`);
}

/** 保存整图 —— version 不匹配会抛 409。 */
export async function saveCanvasGraph(
  id: string,
  nodes: CanvasNode[],
  edges: unknown[],
  version: number,
): Promise<CanvasDetail> {
  return api.put<CanvasDetail>(`/canvases/${id}/graph`, { nodes, edges, version });
}

export async function listCanvasVersions(id: string): Promise<
  Array<{ version: number; created_at: string; node_count: number }>
> {
  return api.get(`/canvases/${id}/versions`);
}

export async function restoreCanvasVersion(id: string, version: number): Promise<CanvasDetail> {
  return api.post<CanvasDetail>(`/canvases/${id}/versions/${version}/restore`);
}

export async function shareCanvas(id: string): Promise<{ share_url: string }> {
  return api.post<{ share_url: string }>(`/canvases/${id}/share`);
}

export async function listCanvasTemplates(): Promise<
  Array<{ id: string; label: string; description: string }>
> {
  return api.get("/canvases/templates");
}

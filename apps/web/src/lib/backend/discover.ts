/**
 * 发现（社区流）后端封装（真调用）。
 * 行内注释1：与首页的「精选演示」区分开 ——
 *             首页 DISCOVER_ITEMS 是平台预置的技能演示素材（静态），
 *             这里 /discover/feed 是用户发布、经审核通过的真实作品流。
 */

import { api } from "@/lib/api";

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

export interface DiscoverFeed {
  items: DiscoverItem[];
  next_cursor: string | null;
}

export async function getFeed(query?: {
  filter?: string;
  query?: string;
  cursor?: string;
  limit?: number;
}): Promise<DiscoverFeed> {
  return api.get<DiscoverFeed>("/discover/feed", {
    filter: query?.filter,
    query: query?.query,
    cursor: query?.cursor,
    limit: query?.limit ?? 30,
  });
}

export async function getItem(id: string): Promise<DiscoverItem> {
  return api.get<DiscoverItem>(`/discover/items/${id}`);
}

export async function likeItem(id: string): Promise<void> {
  await api.post<void>(`/discover/items/${id}/like`, {});
}

export async function publishItem(body: {
  title?: string;
  cover_url?: string;
  capability?: string;
  points?: number;
  tags?: string[];
  tool_href?: string;
  params_snapshot?: Record<string, unknown>;
}): Promise<DiscoverItem> {
  return api.post<DiscoverItem>("/discover/items", body);
}

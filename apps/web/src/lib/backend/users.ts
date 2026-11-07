/**
 * 用户资料 / 会话后端封装（真调用）。
 * 行内注释1：资料保存走 PATCH /users/me —— 后端有昵称长度、邮箱格式、简介长度校验。
 * 行内注释2：头像先上传到资产库拿到 asset_id，再 PATCH 资料时带上。
 */

import { api } from "@/lib/api";

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

export async function getProfile(): Promise<UserProfile> {
  return api.get<UserProfile>("/users/me");
}

/** 更新资料 —— 只传要改的字段，后端未传的字段不动。 */
export async function updateProfile(body: {
  nickname?: string;
  email?: string;
  company?: string;
  bio?: string;
  avatar_asset_id?: string;
}): Promise<UserProfile> {
  return api.patch<UserProfile>("/users/me", body);
}

/** 修改密码 —— 需传旧密码。 */
export async function changePassword(body: {
  old_password: string;
  new_password: string;
}): Promise<void> {
  return api.post<void>("/users/me/password", body);
}

export interface SessionItem {
  id: string;
  device?: string;
  ip?: string;
  created_at?: string;
  last_active_at?: string;
  current?: boolean;
}

export async function listSessions(): Promise<SessionItem[]> {
  return api.get<SessionItem[]>("/auth/sessions");
}

export async function revokeSession(id: string): Promise<void> {
  return api.delete<void>(`/auth/sessions/${id}`);
}

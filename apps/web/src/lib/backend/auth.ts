/**
 * 认证后端封装（真调用）。
 * 行内注释1：短信验证码 + 密码双轨；验证码由后端 Redis 缓存 + 冷却 60s。
 * 行内注释2：体验版后端会直接回传 dev_code，前端自动填入，省去短信通道。
 */

import { api, setToken, getToken } from "@/lib/api";

export interface AuthUser {
  id: string;
  nickname?: string;
  role?: string;
  avatar?: string;
  phone?: string;
  balance?: number;
}

export interface AuthResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  session_id: string;
  user: AuthUser;
}

export interface SmsSendResult {
  cooldown: number;
  expires_in: number;
  dev_code?: string;
}

export async function sendSmsCode(phone: string): Promise<SmsSendResult> {
  return api.post<SmsSendResult>("/auth/sms/send", { phone });
}

export async function verifySmsCode(phone: string, code: string): Promise<AuthResult> {
  const r = await api.post<AuthResult>("/auth/sms/verify", { phone, code });
  setToken(r.access_token);
  return r;
}

export async function passwordLogin(account: string, password: string): Promise<AuthResult> {
  const r = await api.post<AuthResult>("/auth/password/login", { account, password });
  setToken(r.access_token);
  return r;
}

export async function logout(): Promise<void> {
  try {
    await api.post<void>("/auth/logout", {});
  } finally {
    setToken(null);
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

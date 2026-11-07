"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores";
import { getProfile } from "@/lib/backend/users";
import { ApiError } from "@/lib/api";

/**
 * 后台权限门禁（前端侧）。
 * 行内注释1：后端 /api/v1/admin/** 已做角色校验（403 auth.forbidden）——
 *             这里做前端门禁只是提前拦一道，避免普通用户进到后台看到一堆红色报错。
 * 行内注释2：角色来源优先本地 store（登录时写入），store 没有再拉 GET /users/me ——
 *             刷新页面后 persist 的 store 还在，但角色可能已在后台被改，拉一次最准。
 * 行内注释3：可访问角色与后端 xin.admin.roles 保持一致（ADMIN / OPERATOR）。
 */
export const ADMIN_ROLES = ["ADMIN", "OPERATOR"];

export type AdminGuardState = "checking" | "allowed" | "denied" | "anonymous";

export function useAdminGuard(): AdminGuardState {
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<AdminGuardState>("checking");

  const check = useCallback(async () => {
    // 行内注释3.1：本地已有角色 —— 直接判定，不再发请求。
    const localRole = user?.role?.toUpperCase();
    if (localRole && ADMIN_ROLES.includes(localRole)) {
      setState("allowed");
      return;
    }
    try {
      const profile = await getProfile();
      const role = profile.role?.toUpperCase();
      if (role && ADMIN_ROLES.includes(role)) {
        setState("allowed");
      } else {
        setState("denied");
      }
    } catch (e) {
      // 行内注释3.2：401 → 未登录；其他错误 → 视为无权，避免把网络抖动展示成「管理员专属」。
      setState(e instanceof ApiError && e.status === 401 ? "anonymous" : "denied");
    }
  }, [user?.role]);

  useEffect(() => {
    void check();
  }, [check]);

  return state;
}

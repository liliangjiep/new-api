import { redirect } from "next/navigation";

/**
 * 原站 new-ai 实测（2026-10-30）：
 *   /register → 最终 URL https://new-ai/?login=1
 * 注册与登录共用首页弹窗（.modal-login-panel，页签「手机号登录 / 账号登录」，
 * 提交按钮文案为「登录/注册」）。
 */
export default function RegisterPage() {
  redirect("/?login=1");
}

import { redirect } from "next/navigation";

/**
 * 原站 new-api 实测（2026-10-30）：
 *   /login    → 最终 URL https://new-api/            （登录是首页弹窗，不是独立页）
 *   /register → 最终 URL https://new-api/?login=1
 *   /admin    → 最终 URL https://new-api/?login=1&next=%2Fadmin
 */
export default function LoginPage() {
  redirect("/?login=1");
}

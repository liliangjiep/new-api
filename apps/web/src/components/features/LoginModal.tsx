"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores";
import { sendSmsCode, verifySmsCode } from "@/lib/backend/auth";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/features/ToastHost";

/**
 * 原站 new-ai 首页登录/注册弹窗（2026-10-31 实测逐字复刻）
 *
 * 路由行为（实测）：
 *   /login    → 302 到 /
 *   /register → 302 到 /?login=1
 *   /admin    → 302 到 /?login=1&next=%2Fadmin
 *
 *  DOM（实测）：
 *  div.modal-login-shell  fixed inset-0 z-[400] flex items-end justify-center
 *                        p-0 sm:items-center sm:p-4 [color-scheme:light]
 *    ├─ button.modal-backdrop  absolute inset-0 transition-opacity  aria-label="关闭"
 *    │   └─ span.blur-backdrop  pointer-events-none absolute inset-0 overflow-hidden
 *    │       rounded-[inherit] backdrop-blur-md  aria-hidden="true"
 *    │       └─ span.blur-backdrop-shade  absolute inset-0 bg-black (opacity 0.35)
 *    └─ div[role=dialog].modal-login-panel  h-auto max-h-[92vh] relative z-10 flex w-full
 *                              min-w-0 max-w-none flex-col overflow-hidden
 *                              rounded-t-[1.15rem] border bg-surface shadow-none
 *                              sm:max-w-[30rem] sm:rounded-[1.125rem]
 *        └─ div.modal-login-content  relative flex min-h-0 min-w-0 flex-auto flex-col overflow-hidden
 *            ├─ button.modal-login-close  absolute right-0.5 top-0.5 z-[2]
 *            ├─ div.modal-login-scroll  flex min-h-0 flex-auto flex-col overflow-y-auto
 *            │   overflow-x-hidden overscroll-contain bg-[var(--gradient-auth-pane)]
 *            │   ├─ div.modal-login-header  sticky top-0 z-[1] shrink-0 bg-surface/95
 *            │   │   px-4 pb-3 pt-10 backdrop-blur-sm sm:px-6 sm:pt-12
 *            │   │   ├─ h2.modal-login-title  mb-4 text-xl font-semibold tracking-tight
 *            │   │   └─ div.auth-login-tabs  mt-0.5 flex gap-0.5 rounded-[0.65rem]
 *            │   │       bg-[#eceef0] p-1  role="tablist"
 *            │   │       ├─ button[role=tab].auth-login-tab-trigger  短信登录
 *            │   │       └─ button[role=tab].auth-login-tab-trigger  邮箱登录
 *            │   └─ div.shrink-0.px-4.pb-[calc(3rem+env(safe-area-inset-bottom,0px))].pt-4
 *            │       sm:px-6 sm:pb-12
 *            │       └─ form.auth-login-form  novalidate
 *            │           ├─ div.auth-login-fields
 *            │           ├─ div.auth-login-agreement.mt-6
 *            │           └─ button.auth-login-submit.mt-6.w-full.rounded-lg.border-0
 */

type Mode = "phone" | "email";

export function LoginModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const { push } = useToast();

  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  // 行内注释1：真登录状态 —— sending 表示验证码请求在飞，submitting 表示登录在飞。
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Esc 关闭（原站 .modal-login-close + modal-backdrop）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // 行内注释2：真发验证码 —— 走后端 /auth/sms/send，Redis 做 60s 冷却；
  //             体验版后端会回传 dev_code，直接填入输入框方便联调。
  const sendCode = async () => {
    if (mode === "phone") {
      if (!/^1\d{10}$/.test(phone.replace(/\s/g, ""))) {
        setError("请输入正确的 11 位手机号");
        return;
      }
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError("请输入正确的邮箱地址");
        return;
      }
    }
    setError("");
    setSending(true);
    try {
      const r = await sendSmsCode(phone.replace(/\s/g, ""));
      if (r?.dev_code) {
        setCode(r.dev_code);
        push({ tone: "neutral", title: "体验版验证码已自动填入", description: r.dev_code });
      }
      startCountdown();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "验证码发送失败，请稍后重试";
      setError(msg);
      push({ tone: "warning", title: "发送失败", description: msg });
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    if (!agreed) {
      setError("请先阅读并同意用户协议与隐私政策");
      return;
    }
    if (mode === "phone" && !/^1\d{10}$/.test(phone.replace(/\s/g, ""))) {
      setError("请输入正确的 11 位手机号");
      return;
    }
    if (mode === "email" && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("请输入正确的邮箱地址");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const r = await verifySmsCode(phone.replace(/\s/g, ""), code.trim());
      setUser({
        id: r.user?.id ?? "",
        nickname: r.user?.nickname ?? (mode === "phone" ? phone : email),
        role: r.user?.role ?? "user",
      });
      const next = params.get("next") || "/";
      router.push(next);
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "登录失败，请稍后重试";
      setError(msg);
      push({ tone: "warning", title: "登录失败", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (active: boolean) =>
    active
      ? "auth-login-tab-trigger min-h-[2rem] min-w-0 flex-1 rounded-md px-2 text-[11.5px] transition-all duration-200 ease-out sm:px-2.5 bg-surface font-semibold text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)]   "
      : "auth-login-tab-trigger min-h-[2rem] min-w-0 flex-1 rounded-md px-2 text-[11.5px] transition-all duration-200 ease-out sm:px-2.5 font-medium    ";

  return (
    <div className="modal-login-shell fixed inset-0 z-[400] flex items-end justify-center p-0 sm:items-center sm:p-4 [color-scheme:light]">
      <button
        type="button"
        className="modal-backdrop absolute inset-0 transition-opacity"
        aria-label="关闭"
        onClick={onClose}
      >
        <span
          className="blur-backdrop pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] backdrop-blur-md"
          aria-hidden="true"
        >
          <span
            className="blur-backdrop-shade absolute inset-0 bg-black "
            style={{
              opacity: 0.35,
              "--blur-backdrop-opacity-min": "0.25",
              "--blur-backdrop-opacity-max": "0.45",
            } as React.CSSProperties}
          />
        </span>
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-login-title"
        className="modal-login-panel h-auto max-h-[92vh] relative z-10 flex w-full min-w-0 max-w-none flex-col overflow-hidden rounded-t-[1.15rem] border bg-surface shadow-none sm:max-w-[30rem] sm:rounded-[1.125rem]"
      >
        <div className="modal-login-content relative flex min-h-0 min-w-0 flex-auto flex-col overflow-hidden">
          <button
            type="button"
            className="modal-login-close absolute right-0.5 top-0.5 z-[2] flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[0.06] hover:text-foreground active:bg-black/[0.08]"
            aria-label="关闭"
            onClick={onClose}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
              data-slot="icon"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="modal-login-scroll flex min-h-0 flex-auto flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-[var(--gradient-auth-pane)]">
            <div className="modal-login-header sticky top-0 z-[1] shrink-0 bg-surface/95 px-4 pb-3 pt-10 backdrop-blur-sm sm:px-6 sm:pt-12">
              <h2
                id="modal-login-title"
                className="modal-login-title mb-4 text-xl font-semibold tracking-tight text-foreground"
              >
                欢迎使用 new-ai
              </h2>
              <div
                className="auth-login-tabs mt-0.5 flex gap-0.5 rounded-[0.65rem] bg-[#eceef0] p-1 "
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "phone"}
                  onClick={() => {
                    setMode("phone");
                    setError("");
                  }}
                  className={tabClass(mode === "phone")}
                >
                  短信登录
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "email"}
                  onClick={() => {
                    setMode("email");
                    setError("");
                  }}
                  className={tabClass(mode === "email")}
                >
                  邮箱登录
                </button>
              </div>
            </div>

            <div className="shrink-0 px-4 pb-[calc(3rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pb-12">
              <form
                className="auth-login-form [&_p[role=alert]]:mt-1 [&_p[role=alert]]:text-[11px]"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="auth-login-fields ">
                  {mode === "phone" ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex min-h-[44px] items-center rounded-[15px] bg-[#f1f0f5] px-5 py-2.5  gap-0">
                          <span
                            className="shrink-0 select-none text-[14px] font-medium tabular-nums text-foreground"
                            aria-hidden="true"
                          >
                            +86
                          </span>
                          <span
                            className="mx-2.5 h-[1.125rem] w-px shrink-0 self-center  "
                            aria-hidden="true"
                          />
                          <input
                            autoComplete="tel-national"
                            inputMode="numeric"
                            aria-label="手机号"
                            className="auth-pill-input SmsCodeInput_input___pB7Q min-w-0 flex-1 border-0 bg-transparent p-0 leading-normal text-foreground ring-0 placeholder:text-[#9ca3af] disabled:opacity-50 text-[14px] min-w-0 flex-1 "
                            placeholder="请输入手机号"
                            aria-invalid="false"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex min-h-[44px] items-center rounded-[15px] bg-[#f1f0f5] px-5 py-2.5  gap-3">
                          <input
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={6}
                            aria-label="验证码"
                            className="auth-pill-input SmsCodeInput_input___pB7Q min-w-0 flex-1 border-0 bg-transparent p-0 leading-normal text-foreground ring-0 placeholder:text-[#9ca3af] disabled:opacity-50 text-[14px] "
                            placeholder="请输入验证码"
                            aria-invalid="false"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={sendCode}
                            disabled={countdown > 0 || sending}
                            className="shrink-0 border-0 bg-transparent p-0 text-right text-[14px] transition-opacity disabled:pointer-events-none font-normal text-blue-600 transition-colors hover:text-blue-700   disabled:opacity-40"
                          >
                            {sending ? "发送中…" : countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="auth-email-code-input space-y-4">
                      <div className="auth-email-code-email-field">
                        <div className="flex min-h-[44px] items-center rounded-[15px] bg-[#f1f0f5] px-5 py-2.5  ">
                          <input
                            autoComplete="email"
                            aria-label="邮箱"
                            className="auth-pill-input SmsCodeInput_input___pB7Q min-w-0 flex-1 border-0 bg-transparent p-0 leading-normal text-foreground ring-0 placeholder:text-[#9ca3af] disabled:opacity-50 text-[14px] w-full"
                            placeholder="请输入邮箱"
                            aria-invalid="false"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="auth-email-code-code-field">
                        <div className="flex min-h-[44px] items-center rounded-[15px] bg-[#f1f0f5] px-5 py-2.5  gap-3 ">
                          <input
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={6}
                            aria-label="验证码"
                            className="auth-pill-input SmsCodeInput_input___pB7Q min-w-0 flex-1 border-0 bg-transparent p-0 leading-normal text-foreground ring-0 placeholder:text-[#9ca3af] disabled:opacity-50 text-[14px]"
                            placeholder="请输入验证码"
                            aria-invalid="false"
                            type="text"
                            value={emailCode}
                            onChange={(e) => setEmailCode(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={sendCode}
                            disabled={countdown > 0}
                            className="shrink-0 border-0 bg-transparent p-0 text-right text-[14px] transition-opacity disabled:pointer-events-none font-normal text-blue-600 transition-colors hover:text-blue-700 disabled:opacity-40"
                          >
                            {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="auth-login-agreement mt-6">
                  <label className="flex cursor-pointer items-start gap-1.5 text-[10px] leading-snug text-muted">
                    <input
                      className="mt-0.5 shrink-0 rounded border-line accent-blue-600 "
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span>
                      我已阅读并同意
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent-deep underline-offset-2 hover:underline "
                        href="/terms"
                      >
                        用户服务协议
                      </a>
                      、
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-accent-deep underline-offset-2 hover:underline "
                        href="/privacy"
                      >
                        隐私政策
                      </a>
                    </span>
                  </label>
                </div>

                {error ? (
                  <p role="alert" className="mt-2 text-[11px] text-danger">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="auth-login-submit mt-6 w-full rounded-lg border-0 bg-accent py-2 text-[12px] font-semibold tracking-wide text-on-accent shadow-auth-primary transition-[transform,box-shadow,opacity,background]  hover:shadow-auth-primary-hover active:translate-y-[0.5px] disabled:opacity-55 disabled:active:translate-y-0"
                >
                  {submitting ? "登录中…" : "登录/注册"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;

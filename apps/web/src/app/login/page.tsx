"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Button, Input, Label } from "@/components/ui/primitives";
import { Card, CardBody } from "@/components/ui/surfaces";
import { useAuthStore } from "@/stores";
import { setToken } from "@/lib/api";

// M1-11 登录页：验证码流程 mock
// 行内注释1：分两步 —— 1输入手机号→2输入验证码，避免一屏信息过载
// 行内注释2：倒计时用本地 state 即可，无需后端；联调后替换为 POST /auth/sms/send
// 行内注释3：useSearchParams 必须包 Suspense（Next App Router 约束），外层包一层 fallback
// TODO(API): 接入 POST /auth/sms/send 与 POST /auth/sms/verify，替换 mock token
export default function LoginPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <Suspense fallback={<main className="mx-auto max-w-md px-4 py-16"><p className="text-sm text-fg-muted">加载中…</p></main>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

function LoginForm() {
  // 行内注释4：step 状态机只有两个值，用联合类型收窄，避免非法值
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);

  // 行内注释5：手机号校验只做 11 位数字宽松校验，详细规则后端再卡
  const phoneOk = /^1\d{10}$/.test(phone.replace(/\s/g, ""));

  // 行内注释6：发送验证码 —— mock 直接进下一步并启动 60s 倒计时
  const sendCode = () => {
    if (!phoneOk) {
      setError("请输入正确的 11 位手机号");
      return;
    }
    setError("");
    setStep("code");
    setCountdown(60);
    // 行内注释7：倒计时用 interval 递减，到 0 自动清理
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

  // 行内注释8：登录 —— mock 接受任意 4~6 位验证码，写 token 后跳回 next 参数
  const login = () => {
    if (code.trim().length < 4) {
      setError("请输入 4 位以上验证码（体验版任意填写即可）");
      return;
    }
    setError("");
    setToken("mock_access_token");
    setUser({ id: "u_mock", nickname: "张工", role: "user" });
    const next = params.get("next") || "/workbench";
    router.push(next);
  };

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">登录 xin.ai</h1>
      <p className="mt-2 text-sm text-fg-muted">手机号 + 验证码登录，未注册自动创建账号</p>

      <Card className="mt-8">
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="phone" className="mb-1.5 block">
              手机号
            </Label>
            <Input
              id="phone"
              inputMode="numeric"
              placeholder="138 0000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={step === "code"}
            />
          </div>

          {step === "code" && (
            <div>
              <Label htmlFor="code" className="mb-1.5 block">
                验证码
              </Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  inputMode="numeric"
                  placeholder="任意填写 4 位以上"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") login();
                  }}
                  className="tabular flex-1"
                />
                <Button
                  variant="secondary"
                  disabled={countdown > 0}
                  onClick={sendCode}
                  className="tabular shrink-0"
                >
                  {countdown > 0 ? `${countdown}s` : "重发"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}

          {step === "phone" ? (
            <Button className="w-full" onClick={sendCode} disabled={!phoneOk}>
              获取验证码
            </Button>
          ) : (
            <Button className="w-full" onClick={login}>
              登录并进入工作台
            </Button>
          )}

          <p className="text-center text-xs text-fg-subtle">
            登录即代表同意 <Link href="/docs" className="underline underline-offset-4">服务条款与隐私政策</Link>
          </p>
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-sm text-fg-muted">
        还没有账号？<Link href="/register" className="text-accent underline-offset-4 hover:underline">去注册</Link>
      </p>
    </main>
  );
}

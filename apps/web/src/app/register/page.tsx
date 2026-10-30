"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Button, Input, Label } from "@/components/ui/primitives";
import { Card, CardBody } from "@/components/ui/surfaces";
import { Steps } from "@/components/features/QuotePanel";

// M1-11 注册页：三步 —— 手机号 → 验证码 → 资料
// 行内注释1：用 Steps 组件展示进度，current 与 step 同步
// TODO(API): 接入 POST /auth/sms/send /verify 与 PATCH /users/me
export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">创建账号</h1>
        <p className="mt-2 text-sm text-fg-muted">注册即送体验额度，先跑通一单再说</p>

        <div className="mt-6">
          <Steps steps={["手机号", "验证码", "资料"]} current={step} />
        </div>

        <Card className="mt-6">
          <CardBody className="space-y-4">
            {step === 0 && (
              <div>
                <Label htmlFor="r-phone" className="mb-1.5 block">手机号</Label>
                <Input id="r-phone" inputMode="numeric" placeholder="138 0000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button className="mt-4 w-full" disabled={!/^1\d{10}$/.test(phone.replace(/\s/g, ""))} onClick={() => setStep(1)}>
                  下一步
                </Button>
              </div>
            )}
            {step === 1 && (
              <div>
                <Label htmlFor="r-code" className="mb-1.5 block">验证码</Label>
                <Input id="r-code" inputMode="numeric" placeholder="任意填写 4 位以上" value={code} onChange={(e) => setCode(e.target.value)} className="tabular" />
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(0)}>上一步</Button>
                  <Button className="flex-1" disabled={code.trim().length < 4} onClick={() => setStep(2)}>验证</Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <Label htmlFor="r-nick" className="mb-1.5 block">昵称</Label>
                <Input id="r-nick" placeholder="给自己起个名字" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>上一步</Button>
                  <Button className="flex-1" disabled={!nickname.trim()} onClick={() => router.push("/workbench")}>
                    完成注册
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-sm text-fg-muted">
          已有账号？<Link href="/login" className="text-accent underline-offset-4 hover:underline">去登录</Link>
        </p>
      </main>
    </div>
  );
}

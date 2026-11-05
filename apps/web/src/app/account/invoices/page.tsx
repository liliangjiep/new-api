"use client";
import Link from "next/link";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";
import { InvoicesPanel } from "../panels-b";
export default function AccountInvoicesPage() {
  return (
    <WorkspaceShell>
      <section className="mx-auto flex w-full max-w-shell flex-col gap-6 bg-background px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
        <header className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-semibold sm:text-lg">发票管理</h1>
            <p className="mt-1 text-xs text-muted"><Link href="/account" className="underline underline-offset-2">我的积分</Link> / 发票管理</p>
          </div>
        </header>
        <InvoicesPanel />
      </section>
    </WorkspaceShell>
  );
}

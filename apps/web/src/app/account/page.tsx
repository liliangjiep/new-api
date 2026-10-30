"use client";

import { useState } from "react";
import { StudioShell } from "@/components/layout/StudioShell";
import { Tabs } from "@/components/ui/surfaces";
import { ProfilePanel, SecurityPanel, CreditsPanel } from "./panels-a";
import {
  LedgerPanel,
  OrdersPanel,
  InvoicesPanel,
  ApiKeysPanel,
} from "./panels-b";

const TABS = [
  { id: "profile", label: "资料" },
  { id: "security", label: "安全" },
  { id: "credits", label: "余额" },
  { id: "ledger", label: "流水" },
  { id: "orders", label: "订单" },
  { id: "invoices", label: "发票" },
  { id: "apikeys", label: "API 密钥" },
];

export default function AccountPage() {
  const [tab, setTab] = useState("profile");

  return (
    <StudioShell title="账户中心" description="资料、安全、余额、流水、订单与发票">
      <div className="mx-auto max-w-4xl space-y-4">
        <Tabs items={TABS} value={tab} onChange={setTab} />

        {tab === "profile" && <ProfilePanel />}
        {tab === "security" && <SecurityPanel />}
        {tab === "credits" && <CreditsPanel />}
        {tab === "ledger" && <LedgerPanel />}
        {tab === "orders" && <OrdersPanel />}
        {tab === "invoices" && <InvoicesPanel />}
        {tab === "apikeys" && <ApiKeysPanel />}
      </div>
    </StudioShell>
  );
}
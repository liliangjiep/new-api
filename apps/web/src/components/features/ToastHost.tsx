"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast } from "@/components/ui/overlays";

interface ToastItem {
  id: string;
  tone: "neutral" | "success" | "danger" | "warning";
  title: string;
  description?: string;
}

// 行内注释1：全局轻量 toast —— 无第三方依赖，push 后 3.2s 自动消失
// 行内注释2：放在 providers 下但本文件自包含，避免改动 layout 树
// TODO(API): 与后端通知通道打通后可扩展为持久化通知中心
const ToastCtx = createContext<{ push: (t: Omit<ToastItem, "id">) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setItems((p) => [...p.slice(-3), { ...t, id }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {items.length > 0 ? (
        <div
          className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2"
          aria-live="polite"
        >
          {items.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast tone={t.tone} title={t.title} description={t.description} onClose={() => setItems((p) => p.filter((x) => x.id !== t.id))} />
            </div>
          ))}
        </div>
      ) : null}
    </ToastCtx.Provider>
  );
}

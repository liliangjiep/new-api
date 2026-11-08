"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * 查询参数读取器（CSR 逃生小组件）。
 *
 * 行内注释1：为什么需要它 ——
 *   Next.js App Router 里，在页面组件直接调用 useSearchParams() 会触发
 *   「CSR bailout」：静态预渲染时必须包一层 <Suspense>，否则 next build 直接报错
 *   （useSearchParams() should be wrapped in a suspense boundary at page "..."）。
 *   把整页塞进 Suspense 会让首屏退化成 fallback，静态 HTML 里没有内容。
 *
 * 行内注释2：这里的做法 —— 把「读 query 并回调」抽成一个小组件，
 *   只有它被 <Suspense> 包住（fallback 为 null，不影响首屏主体），
 *   页面主体照常静态预渲染，客户端 hydrate 后再触发回调。
 *
 * 行内注释3：为什么不用 window.location ——
 *   那会造成「服务端渲染的初始值 ≠ 客户端真实值」的水合不一致，
 *   React 会警告且行为不可预期。走 useSearchParams 是官方路径。
 *
 * 行内注释4：依赖用 query 字符串而不是 searchParams 对象 ——
 *   不同 Next 版本里 useSearchParams() 每次渲染可能返回新对象，
 *   放进 useEffect 依赖会导致死循环。这里比较字符串，且用 lastRef 去重，
 *   保证同一个值只回调一次。
 */
export function QueryParamBridge({
  name,
  onValue,
}: {
  /** 读取的查询参数名。 */
  name: string;
  /** 取到值时的回调（值非空才调，同一个值只调一次）。 */
  onValue: (value: string) => void;
}) {
  return (
    <Suspense fallback={null}>
      <QueryParamEffect name={name} onValue={onValue} />
    </Suspense>
  );
}

function QueryParamEffect({
  name,
  onValue,
}: {
  name: string;
  onValue: (value: string) => void;
}) {
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const lastRef = useRef<string>("");
  const cbRef = useRef(onValue);
  cbRef.current = onValue;

  useEffect(() => {
    const v = new URLSearchParams(query).get(name);
    if (!v || v === lastRef.current) return;
    lastRef.current = v;
    cbRef.current(v);
  }, [query, name]);

  return null;
}

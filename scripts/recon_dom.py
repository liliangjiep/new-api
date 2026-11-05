# -*- coding: utf-8 -*-
"""针对单个路由做深度 DOM dump 对比。"""
import asyncio, json, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

ORIG = "https://susu.da-ai.cc"
LOCAL = "http://localhost:3000"


async def dump(page, sel):
    return await page.evaluate("""(sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const walk = (n, d) => {
            if (d > 6) return null;
            const r = n.getBoundingClientRect();
            const cs = getComputedStyle(n);
            return {
                tag: n.tagName.toLowerCase(),
                cls: (n.getAttribute('class')||'').slice(0,140),
                r: [Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10, Math.round(r.height*10)/10],
                disp: cs.display, pos: cs.position, ov: cs.overflow,
                ar: cs.aspectRatio, objFit: cs.objectFit, br: cs.borderRadius,
                kids: Array.from(n.children).map(c => walk(c, d+1)).filter(Boolean)
            };
        };
        return walk(el, 0);
    }""", sel)


async def main():
    path = sys.argv[1]
    sel = sys.argv[2]
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for base, tag in ((ORIG, "ORIG"), (LOCAL, "OURS")):
            ctx = await br.new_context(viewport={"width":1600,"height":900}, locale="zh-CN")
            page = await ctx.new_page()
            await page.goto(base+path, wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(6000)
            d = await dump(page, sel)
            print("="*30, tag, "="*30)
            print(json.dumps(d, ensure_ascii=False, indent=1))
            await ctx.close()
        await br.close()

asyncio.run(main())
